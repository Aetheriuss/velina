// ReSharper disable InconsistentNaming
#pragma warning disable CS8618
namespace Roblox;

public class GameServerConfigEntry
{
    public string ip { get; set; }
    public string domain { get; set; }
    public int maxServerCount { get; set; }
}

public static class Configuration
{
    public static string CdnBaseUrl { get; set; }
    public static string StorageDirectory { get; set; }
    public static string AssetDirectory { get; set; }
    public static string PublicDirectory { get; set; }
    public static string ThumbnailsDirectory { get; set; }
    public static string GroupIconsDirectory { get; set; }
    public static string XmlTemplatesDirectory { get; set; }
    public static string JsonDataDirectory { get; set; }
    public static string AdminBundleDirectory { get; set; }
    public static string EconomyChatBundleDirectory { get; set; }
    public static string BaseUrl { get; set; }
    public static string FrontendBaseUrl { get; set; } = "http://localhost:3000";
    public static string HCaptchaPublicKey { get; set; }
    public static string HCaptchaPrivateKey { get; set; }
    // hCaptcha is on unless "HCaptcha:Enabled" is explicitly "false". When off, captcha verification is
    // skipped and the widget is not rendered (use when the site keys are missing/invalid).
    public static bool CaptchaEnabled { get; set; } = true;
    public static IEnumerable<GameServerConfigEntry> GameServerIpAddresses { get; set; }
    public static string GameServerAuthorization { get; set; }
    public static string RobloxAppPrefix { get; set; } = "rbxeconsim:";
    public static string AssetValidationServiceUrl { get; set; }
    public static string AssetValidationServiceAuthorization { get; set; }
    public static string BotAuthorization { get; set; }
    public static string RccAuthorization { get; set; }
    // M6: moved out of source. Signing key for the user-agent-bypass JWT cookie. Populated from config
    // at startup (Program.cs) with a per-process CSPRNG fallback when unset — same approach as the
    // game-server ticket key (P1-2). Never ship a literal secret here.
    public static string UserAgentBypassSecret { get; set; }
    // M6: moved out of source. Signing key for the verification-phrase JWT cookie (WebsiteServices/Verification.cs).
    public static string VerificationSecret { get; set; }
    // Discord OAuth — the ONLY public registration/login path. ClientId/Secret from the Discord developer
    // portal; RedirectUri must be the public callback (e.g. https://velina.lol/auth/discord/callback) and
    // be listed as an allowed redirect on the Discord application.
    public static string DiscordClientId { get; set; }
    public static string DiscordClientSecret { get; set; }
    public static string DiscordRedirectUri { get; set; }
    public static long PackageShirtAssetId { get; set; }
    public static long PackagePantsAssetId { get; set; }
    public static long PackageLeftArmAssetId { get; set; }
    public static long PackageRightArmAssetId { get; set; }
    public static long PackageLeftLegAssetId { get; set; }
    public static long PackageRightLegAssetId { get; set; }
    public static long PackageTorsoAssetId { get; set; }
    private static IEnumerable<long>? _SignupAssetIds { get; set; }

    public static IEnumerable<long> SignupAssetIds
    {
        get => _SignupAssetIds ?? ArraySegment<long>.Empty;
        set
        {
            if (_SignupAssetIds != null)
                throw new Exception("Cannot set startup asset ids - they are not null.");
            _SignupAssetIds = value;
        }
    }
    private static IEnumerable<long>? _SignupAvatarAssetIds { get; set; }

    public static IEnumerable<long> SignupAvatarAssetIds
    {
        get => _SignupAvatarAssetIds ?? ArraySegment<long>.Empty;
        set
        {
            if (_SignupAvatarAssetIds != null)
                throw new Exception("Cannot set signup avatar asset ids, they are not null");
            _SignupAvatarAssetIds = value;
        }
    }

    public static string GameServerDomain => "gameserver.com"; // set to your game server's domain
}