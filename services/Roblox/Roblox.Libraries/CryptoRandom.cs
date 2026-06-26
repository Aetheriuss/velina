using System.Security.Cryptography;

namespace Roblox.Libraries;

/// <summary>
/// Cryptographically-secure random tokens. Replaces Guid.NewGuid() (a v4 UUID is NOT from a
/// CSPRNG) and System.Random for anything security-sensitive — session ids, password-reset
/// tokens, CSRF values/keys (security findings H4, M3).
/// </summary>
public static class CryptoRandom
{
    /// <summary>URL-safe base64 token from a CSPRNG. Default 32 bytes (256 bits).</summary>
    public static string TokenUrlSafe(int byteLength = 32)
    {
        if (byteLength < 16)
            throw new ArgumentOutOfRangeException(nameof(byteLength), "Use at least 16 bytes");
        var bytes = RandomNumberGenerator.GetBytes(byteLength);
        return Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    }
}
