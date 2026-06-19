using System.Security.Cryptography;
using System.Text;

namespace EngineeringManager.Api.Security;

/// <summary>
/// v1.2.0 PiiProtector — 字段级 PII 加密 (AES-GCM + DPAPI)
/// 架构:
///   1. master key 32 字节 (首次启动随机生成, 存 %APPDATA%\工程管家\pp.key)
///   2. master key 用 Windows DPAPI (CurrentUser scope) 加密后存盘
///   3. 运行时解密 master key, 用 AES-GCM 加密 PII 字段
///   4. 密文 = base64(nonce[12] || tag[16] || ciphertext)
///   5. 异常时 throw + log, 不 swallow (P1-1)
/// </summary>
public class PiiProtector
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private const int KeySize = 32; // 256-bit AES

    private readonly byte[] _masterKey;
    private readonly ILogger _logger;

    public PiiProtector(ILogger<PiiProtector> logger)
    {
        _logger = logger;
        _masterKey = LoadOrCreateMasterKey();
    }

    /// <summary>加密 PII 字符串 → base64 密文</summary>
    public string Encrypt(string plain)
    {
        if (string.IsNullOrEmpty(plain)) return "";
        try
        {
            var plainBytes = Encoding.UTF8.GetBytes(plain);
            var nonce = new byte[NonceSize];
            RandomNumberGenerator.Fill(nonce);
            var cipher = new byte[plainBytes.Length];
            var tag = new byte[TagSize];

            using var aes = new AesGcm(_masterKey, TagSize);
            aes.Encrypt(nonce, plainBytes, cipher, tag);

            var result = new byte[NonceSize + TagSize + cipher.Length];
            Buffer.BlockCopy(nonce, 0, result, 0, NonceSize);
            Buffer.BlockCopy(tag, 0, result, NonceSize, TagSize);
            Buffer.BlockCopy(cipher, 0, result, NonceSize + TagSize, cipher.Length);
            return Convert.ToBase64String(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Encrypt failed");
            throw;
        }
    }

    /// <summary>解密 base64 密文 → PII 字符串</summary>
    public string Decrypt(string cipherText)
    {
        if (string.IsNullOrEmpty(cipherText)) return "";
        try
        {
            var data = Convert.FromBase64String(cipherText);
            if (data.Length < NonceSize + TagSize)
                throw new InvalidOperationException("密文长度不足");

            var nonce = new byte[NonceSize];
            var tag = new byte[TagSize];
            var cipher = new byte[data.Length - NonceSize - TagSize];
            Buffer.BlockCopy(data, 0, nonce, 0, NonceSize);
            Buffer.BlockCopy(data, NonceSize, tag, 0, TagSize);
            Buffer.BlockCopy(data, NonceSize + TagSize, cipher, 0, cipher.Length);

            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(_masterKey, TagSize);
            aes.Decrypt(nonce, cipher, tag, plain);
            return Encoding.UTF8.GetString(plain);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PiiProtector] Decrypt failed");
            throw;
        }
    }

    /// <summary>加载或创建 master key (DPAPI 加密存 %APPDATA%)</summary>
    private byte[] LoadOrCreateMasterKey()
    {
        var appData = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "工程管家");
        Directory.CreateDirectory(appData);
        var keyPath = Path.Combine(appData, "pp.key");

        byte[] encryptedKey;
        byte[] masterKey;

        if (File.Exists(keyPath))
        {
            encryptedKey = File.ReadAllBytes(keyPath);
            try
            {
                masterKey = ProtectedData.Unprotect(encryptedKey, null, DataProtectionScope.CurrentUser);
                if (masterKey.Length != KeySize)
                    throw new InvalidOperationException("master key 长度错误");
                return masterKey;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[PiiProtector] 解密 master key 失败, 重新生成");
                // 跨用户或损坏 → 重新生成 (旧 _enc 数据将无法解密, 强制重置密码)
            }
        }

        // 生成新 master key
        masterKey = new byte[KeySize];
        RandomNumberGenerator.Fill(masterKey);

        // DPAPI 加密后存盘
        encryptedKey = ProtectedData.Protect(masterKey, null, DataProtectionScope.CurrentUser);
        File.WriteAllBytes(keyPath, encryptedKey);
        _logger.LogInformation("[PiiProtector] 已生成新 master key 到 {Path}", keyPath);
        return masterKey;
    }
}
