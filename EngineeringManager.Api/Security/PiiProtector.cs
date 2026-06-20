using System.Data;
using System.Security.Cryptography;
using System.Text;
using Dapper;

namespace EngineeringManager.Api.Security;

/// <summary>
/// v0.76.0 PiiProtector — 字段级 PII 加密 (AES-GCM + DPAPI) + 列级 key rotation
///
/// 架构 (v0.76.0):
///   1. master key 32 字节 (首次启动随机生成)
///   2. master key 用 Windows DPAPI (CurrentUser scope) 加密后存 [pii_keys] 表
///   3. 运行时从 [pii_keys] 加载所有 key, 按 version byte 选 key 加/解密
///   4. 密文 = base64(version[1] || nonce[12] || tag[16] || ciphertext)
///   5. 旧密文 (v1.2.0 格式, 无 version 字节) → fallback 到 key_id=1 (legacy)
///   6. rotation: 写新 key (is_active=1), 旧 key 标 retired_at; 新密文带新 version
///   7. 异常 throw + log, 不 swallow (P1-1)
///
/// 升级路径:
///   - v0.76.0 首次启动: pii_keys 表空 → 从 %APPDATA%\工程管家\pp.key 导入, 写 key_id=1 is_active=1
///   - 之后: 每次启动加载所有 key, 用于解密历史密文
///   - rotation: 任何时候调 Rotate() 生成新 key_id=N+1
///
/// 新旧密文区分: 读首字节, 若值在 [1, 200] 且 _keysById 包含 → 新格式; 否则旧格式
///   - 旧格式首字节是随机 nonce 字节 (0-255), 撞上 [1, 200] 且是有效 key_id 的概率 ~1/256
///   - 这种边界 case 解密会失败抛异常, 不会静默错解
///
/// 线程安全: 单例, 所有读写 _keysById/_activeKeyId 用 _lock 保护
/// </summary>
public class PiiProtector
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32; // 256-bit AES

    private readonly object _lock = new();
    private readonly ILogger _logger;
    private Dictionary<int, byte[]> _keysById = new();
    private int _activeKeyId = 0;
    private bool _initialized = false;

    public PiiProtector(ILogger<PiiProtector> logger)
    {
        _logger = logger;
    }

    /// <summary>是否已初始化</summary>
    public bool IsInitialized => _initialized;

    /// <summary>当前 active key_id (用于新写入)。0 = 未初始化</summary>
    public int ActiveKeyId
    {
        get { lock (_lock) return _activeKeyId; }
    }

    /// <summary>已加载的 key 数量</summary>
    public int KeyCount
    {
        get { lock (_lock) return _keysById.Count; }
    }

    /// <summary>
    /// 启动时调用一次：加载所有 PII keys (从 pii_keys 表)，如空则从 pp.key 文件迁移
    /// </summary>
    public void Initialize(IDbConnection db)
    {
        if (_initialized) return;
        lock (_lock)
        {
            if (_initialized) return;

            EnsureSchema(db);
            var count = db.ExecuteScalar<int>("SELECT COUNT(*) FROM pii_keys");
            if (count == 0)
            {
                MigrateFromLegacyFile(db);
            }
            LoadKeysInternal(db);
            _initialized = true;
            _logger.LogInformation("[PiiProtector] 初始化完成, 加载 {Count} 个 key, active_key_id={ActiveId}",
                _keysById.Count, _activeKeyId);
        }
    }

    /// <summary>
    /// 加密 PII 字符串 → base64 密文 (使用当前 active key, 写入 version 字节)
    /// </summary>
    public string Encrypt(string plain)
    {
        if (string.IsNullOrEmpty(plain)) return "";
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        try
        {
            int keyId;
            byte[] masterKey;
            lock (_lock)
            {
                if (_activeKeyId == 0 || !_keysById.TryGetValue(_activeKeyId, out masterKey!))
                    throw new InvalidOperationException("无 active key");
                keyId = _activeKeyId;
            }

            var plainBytes = Encoding.UTF8.GetBytes(plain);
            var nonce = new byte[NonceSize];
            RandomNumberGenerator.Fill(nonce);
            var cipher = new byte[plainBytes.Length];
            var tag = new byte[TagSize];

            using var aes = new AesGcm(masterKey, TagSize);
            aes.Encrypt(nonce, plainBytes, cipher, tag);

            // 密文格式: version[1] || nonce[12] || tag[16] || ciphertext[N]
            var result = new byte[1 + NonceSize + TagSize + cipher.Length];
            result[0] = (byte)keyId;
            Buffer.BlockCopy(nonce, 0, result, 1, NonceSize);
            Buffer.BlockCopy(tag, 0, result, 1 + NonceSize, TagSize);
            Buffer.BlockCopy(cipher, 0, result, 1 + NonceSize + TagSize, cipher.Length);
            return Convert.ToBase64String(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Encrypt failed");
            throw;
        }
    }

    /// <summary>
    /// 解密 base64 密文 → PII 字符串
    /// 新格式: 首字节 = key_id, 1+12+16+N 字节
    /// 旧格式 (v1.2.0): 无 version, 12+16+N 字节 → fallback 到 key_id=1
    /// </summary>
    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return "";
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        try
        {
            var data = Convert.FromBase64String(cipherText);
            if (data.Length < NonceSize + TagSize)
                throw new InvalidOperationException("密文长度不足");

            byte firstByte = data[0];
            int headerSize;
            byte[] masterKey;

            lock (_lock)
            {
                // 启发式: 首字节在 [1, 200] 且在 _keysById 中 → 新格式
                if (firstByte >= 1 && firstByte <= 200 && _keysById.ContainsKey(firstByte))
                {
                    if (!_keysById.TryGetValue(firstByte, out masterKey!))
                        throw new InvalidOperationException($"找不到 key_id={firstByte}");
                    headerSize = 1 + NonceSize + TagSize;
                }
                else
                {
                    // 旧格式 fallback: 用 key_id=1 (legacy, 来自 pp.key 迁移)
                    if (!_keysById.TryGetValue(1, out masterKey!))
                        throw new InvalidOperationException("旧格式密文但找不到 legacy key_id=1");
                    headerSize = NonceSize + TagSize;
                }
            }

            var nonce = new byte[NonceSize];
            var tag = new byte[TagSize];
            var cipher = new byte[data.Length - headerSize];
            Buffer.BlockCopy(data, headerSize - NonceSize - TagSize, nonce, 0, NonceSize);
            Buffer.BlockCopy(data, headerSize - TagSize, tag, 0, TagSize);
            Buffer.BlockCopy(data, headerSize, cipher, 0, cipher.Length);

            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(masterKey, TagSize);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Decrypt failed");
            throw;
        }
    }

    /// <summary>
    /// Key rotation: 生成新 master key, 写 pii_keys 表 (is_active=1), 旧 active 标 retired
    /// 返回新 key_id
    /// </summary>
    public int Rotate(IDbConnection db, string adminUid)
    {
        if (!_initialized) throw new InvalidOperationException("PiiProtector 未初始化");
        lock (_lock)
        {
            // 1. 生成新 master key
            var newKey = new byte[KeySize];
            RandomNumberGenerator.Fill(newKey);

            // 2. DPAPI 加密
            var encrypted = ProtectedData.Protect(newKey, null, DataProtectionScope.CurrentUser);

            // 3. 标旧 active 为 retired
            db.Execute(@"UPDATE pii_keys SET is_active = 0, retired_at = @Now
                         WHERE is_active = 1",
                new { Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });

            // 4. 写新 key (is_active=1) — 先 INSERT 再查 last_insert_rowid
            db.Execute(@"INSERT INTO pii_keys
                (encrypted_key, is_active, created_at, created_by)
                VALUES (@Encrypted, 1, @Now, @CreatedBy)",
                new { Encrypted = encrypted, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"), CreatedBy = adminUid });
            var newKeyId = db.ExecuteScalar<int>("SELECT last_insert_rowid()");

            // 5. 内存更新
            _keysById[newKeyId] = newKey;
            _activeKeyId = newKeyId;

            _logger.LogInformation("[PiiProtector] Key rotated: new key_id={KeyId} by admin={Uid}", newKeyId, adminUid);
            return newKeyId;
        }
    }

    /// <summary>列出所有 keys (admin 用, 看历史 rotation 记录)</summary>
    public IEnumerable<object> ListKeys(IDbConnection db)
    {
        return db.Query(@"SELECT key_id as KeyId, is_active as IsActive,
                                created_at as CreatedAt, created_by as CreatedBy,
                                retired_at as RetiredAt
                         FROM pii_keys ORDER BY key_id DESC");
    }

    // ──────────── 私有方法 ────────────

    private void EnsureSchema(IDbConnection db)
    {
        db.Execute(@"CREATE TABLE IF NOT EXISTS pii_keys (
            key_id INTEGER PRIMARY KEY AUTOINCREMENT,
            encrypted_key BLOB NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            created_by TEXT,
            retired_at TEXT
        )");
        db.Execute("CREATE INDEX IF NOT EXISTS idx_pii_keys_active ON pii_keys(is_active)");
    }

    private void MigrateFromLegacyFile(IDbConnection db)
    {
        var appData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        var keyPath = Path.Combine(appData, "pp.key");

        byte[] masterKey;
        if (File.Exists(keyPath))
        {
            try
            {
                var encrypted = File.ReadAllBytes(keyPath);
                masterKey = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
                if (masterKey.Length != KeySize)
                    throw new InvalidOperationException("master key 长度错误");
                _logger.LogInformation("[PiiProtector] 从 {Path} 迁移 legacy master key 到 pii_keys", keyPath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[PiiProtector] 读 legacy pp.key 失败, 生成新 key");
                masterKey = new byte[KeySize];
                RandomNumberGenerator.Fill(masterKey);
            }
        }
        else
        {
            _logger.LogInformation("[PiiProtector] 无 legacy pp.key 文件, 生成新 master key");
            masterKey = new byte[KeySize];
            RandomNumberGenerator.Fill(masterKey);
        }

        // DPAPI 加密后写 pii_keys (key_id=1, is_active=1)
        var dpapiEncrypted = ProtectedData.Protect(masterKey, null, DataProtectionScope.CurrentUser);
        db.Execute(@"INSERT INTO pii_keys
            (encrypted_key, is_active, created_at, created_by)
            VALUES (@Encrypted, 1, @Now, 'migration-from-pp.key')",
            new { Encrypted = dpapiEncrypted, Now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") });
    }

    private void LoadKeysInternal(IDbConnection db)
    {
        var rows = db.Query<(int key_id, byte[] encrypted_key)>(
            "SELECT key_id, encrypted_key FROM pii_keys");

        _keysById.Clear();
        foreach (var (keyId, encryptedKey) in rows)
        {
            try
            {
                var masterKey = ProtectedData.Unprotect(encryptedKey, null, DataProtectionScope.CurrentUser);
                if (masterKey.Length != KeySize)
                {
                    _logger.LogWarning("[PiiProtector] key_id={KeyId} 长度异常, 跳过", keyId);
                    continue;
                }
                _keysById[keyId] = masterKey;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PiiProtector] 解密 key_id={KeyId} 失败, 跳过", keyId);
            }
        }

        // 找 active: is_active=1 优先, 否则 key_id 最大
        var activeRow = db.QueryFirstOrDefault<int?>(
            "SELECT key_id FROM pii_keys WHERE is_active = 1 ORDER BY key_id DESC LIMIT 1");
        int active;
        if (activeRow.HasValue)
        {
            active = activeRow.Value;
        }
        else if (_keysById.Count > 0)
        {
            active = _keysById.Keys.Max();
            _logger.LogWarning("[PiiProtector] 无 is_active=1 的 key, 用最大 key_id={Active} 作为 active", active);
        }
        else
        {
            throw new InvalidOperationException("PiiProtector: pii_keys 表无可用 key");
        }

        _activeKeyId = _keysById.ContainsKey(active) ? active : 0;
        if (_activeKeyId == 0)
            throw new InvalidOperationException("PiiProtector: 无法设置 active key");
    }
}