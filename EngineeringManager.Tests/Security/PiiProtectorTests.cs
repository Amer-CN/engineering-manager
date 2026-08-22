using System.Data;
using System.Text;
using Dapper;
using EngineeringManager.Api;
using EngineeringManager.Api.Security;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace EngineeringManager.Tests.Security;

/// <summary>
/// v0.76.0 累计待办 #5: PiiProtector 多 key 加密测试
/// 测试场景: 加密/解密 roundtrip, key rotation, 旧格式兼容
/// </summary>
public class PiiProtectorTests : IDisposable
{
    private readonly string _dbPath;
    private readonly IDbConnection _db;
    private readonly PiiProtector _pii;

    public PiiProtectorTests()
    {
        // 每个测试一个独立 db 文件
        _dbPath = Path.Combine(Path.GetTempPath(), $"pii-test-{Guid.NewGuid()}.db");
        var connStr = $"Data Source={_dbPath};Pooling=False";
        // 跑 migration 023 (建 pii_keys 表)
        EngineeringManager.Api.Migrations.MigrationRunner.Run(connStr);
        _db = new SqliteConnection(connStr);
        _db.Open();
        _pii = new PiiProtector(NullLogger<PiiProtector>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        if (File.Exists(_dbPath)) File.Delete(_dbPath);
    }

    [Fact]
    public void Initialize_CreatesDefaultKey_WhenPiiKeysEmpty()
    {
        _pii.Initialize(_db);

        Assert.True(_pii.IsInitialized);
        Assert.Equal(1, _pii.ActiveKeyId);
        Assert.Equal(1, _pii.KeyCount);
    }

    [Fact]
    public void Encrypt_Decrypt_Roundtrip()
    {
        _pii.Initialize(_db);
        var plain = "[已脱敏]"; // 11 位手机号
        var cipher = _pii.Encrypt(plain);
        var back = _pii.Decrypt(cipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Encrypt_Decrypt_EmptyString_ReturnsEmpty()
    {
        _pii.Initialize(_db);
        Assert.Equal("", _pii.Encrypt(""));
        Assert.Equal("", _pii.Decrypt(""));
        Assert.Equal("", _pii.Encrypt(null!));
    }

    [Fact]
    public void Encrypt_Decrypt_LongString()
    {
        _pii.Initialize(_db);
        var plain = new string('A', 1000) + "测试中文" + new string('B', 500);
        var cipher = _pii.Encrypt(plain);
        var back = _pii.Decrypt(cipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Rotate_GeneratesNewKey_AndRetiresOld()
    {
        _pii.Initialize(_db);
        var oldKeyId = _pii.ActiveKeyId;

        var newKeyId = _pii.Rotate(_db, "test-admin");
        Assert.Equal(oldKeyId + 1, newKeyId);
        Assert.Equal(newKeyId, _pii.ActiveKeyId);
        Assert.Equal(2, _pii.KeyCount);

        // 验证 DB: 新 key is_active=1, 旧 key is_active=0 + retired_at
        var keys = _db.Query<(int key_id, int is_active, string? retired_at)>(
            "SELECT key_id, is_active, retired_at FROM pii_keys ORDER BY key_id").ToList();
        Assert.Equal(2, keys.Count);
        // keys[0] = key_id=1 (retired, 旧的), keys[1] = key_id=2 (active, 新的)
        Assert.Equal(0, keys[0].is_active);
        Assert.NotNull(keys[0].retired_at);
        Assert.Equal(1, keys[1].is_active);
        Assert.Null(keys[1].retired_at);
    }

    [Fact]
    public void Rotate_OldCiphertext_StillDecryptable()
    {
        _pii.Initialize(_db);
        var plain = "secret-data-001";
        var oldCipher = _pii.Encrypt(plain);

        // 旋转
        _pii.Rotate(_db, "test-admin");
        Assert.NotEqual(1, _pii.ActiveKeyId);

        // 旧密文仍能解
        var back = _pii.Decrypt(oldCipher);
        Assert.Equal(plain, back);
    }

    [Fact]
    public void Rotate_NewCiphertext_UsesNewKeyId()
    {
        _pii.Initialize(_db);
        _pii.Rotate(_db, "test-admin");
        var newCipher = _pii.Encrypt("after-rotation");

        // 验证密文首字节 = 新 key_id
        var data = Convert.FromBase64String(newCipher);
        Assert.Equal(_pii.ActiveKeyId, data[0]);
    }

    [Fact]
    public void Decrypt_LegacyFormat_FallsBackToKey1()
    {
        _pii.Initialize(_db);
        // 手搓 v1.2.0 旧格式密文: nonce[12] || tag[16] || ciphertext
        // 用当前 active key (key_id=1) 加密, 但不带 version 字节
        var dpapiKeyArr = _db.Query<byte[]>("SELECT encrypted_key FROM pii_keys WHERE key_id = 1").First();
        var dpapiKey = System.Security.Cryptography.ProtectedData.Unprotect(
            dpapiKeyArr, null, System.Security.Cryptography.DataProtectionScope.CurrentUser);

        var plain = Encoding.UTF8.GetBytes("legacy-data");
        var nonce = new byte[12];
        System.Security.Cryptography.RandomNumberGenerator.Fill(nonce);
        var cipher = new byte[plain.Length];
        var tag = new byte[16];
        using (var aes = new System.Security.Cryptography.AesGcm(dpapiKey, 16))
        {
            aes.Encrypt(nonce, plain, cipher, tag);
        }
        var legacyCipherBytes = new byte[12 + 16 + cipher.Length];
        Buffer.BlockCopy(nonce, 0, legacyCipherBytes, 0, 12);
        Buffer.BlockCopy(tag, 0, legacyCipherBytes, 12, 16);
        Buffer.BlockCopy(cipher, 0, legacyCipherBytes, 28, cipher.Length);
        var legacyCipher = Convert.ToBase64String(legacyCipherBytes);

        // 解密应 fallback 到 key_id=1 并成功
        var back = _pii.Decrypt(legacyCipher);
        Assert.Equal("legacy-data", back);
    }

    [Fact]
    public void Initialize_Idempotent_DoesNotCreateDuplicateKey()
    {
        _pii.Initialize(_db);
        var firstCount = _pii.KeyCount;
        // 再次调用 Initialize 不应重复迁移
        _pii.Initialize(_db);
        Assert.Equal(firstCount, _pii.KeyCount);
    }

    [Fact]
    public void Encrypt_NotInitialized_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => _pii.Encrypt("test"));
    }

    [Fact]
    public void Rotate_NotInitialized_Throws()
    {
        Assert.Throws<InvalidOperationException>(() => _pii.Rotate(_db, "test"));
    }

    [Fact]
    public void Encrypt_SamePlaintext_Twice_ProducesDifferentCiphertexts()
    {
        // AES-GCM 每次加密使用随机 nonce → 同明文两次加密密文必须不同
        // （若 nonce 变成固定值/复用，GCM 会泄露明文相关性，本测试变红）
        _pii.Initialize(_db);
        var plain = "[已脱敏]";
        var c1 = _pii.Encrypt(plain);
        var c2 = _pii.Encrypt(plain);

        Assert.NotEqual(c1, c2);
        // 密文 base64 中不得包含明文子串
        Assert.DoesNotContain(plain, c1);
        Assert.DoesNotContain(plain, c2);
        // 两密文均可正常解密回明文（确保不是"坏"密文凑出来的不同）
        Assert.Equal(plain, _pii.Decrypt(c1));
        Assert.Equal(plain, _pii.Decrypt(c2));
    }

    [Fact]
    public void Decrypt_TamperedCiphertext_ThrowsCryptographicException()
    {
        // 篡改密文最后 1 字节（GCM 认证标签校验必须失败 → AesGcm.Decrypt 抛 CryptographicException）
        _pii.Initialize(_db);
        var plain = "tamper-test-[已脱敏]";
        var cipher = _pii.Encrypt(plain);

        var data = Convert.FromBase64String(cipher);
        data[^1] ^= 0xFF; // 翻转最后一个密文字节
        var tampered = Convert.ToBase64String(data);

        Assert.ThrowsAny<System.Security.Cryptography.CryptographicException>(
            () => _pii.Decrypt(tampered));
    }
}