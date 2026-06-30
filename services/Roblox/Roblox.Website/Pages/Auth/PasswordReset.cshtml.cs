using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Roblox.Website.Pages.Auth;

// Discord-only auth: normal accounts have no password to reset, and the old
// social-media verification flow has been removed. This page now just redirects
// to Discord login. Properties are retained so the .cshtml view still binds.
public class PasswordReset : RobloxPageModel
{
    [BindProperty]
    public string? username { get; set; }
    [BindProperty]
    public string? action { get; set; }
    [FromForm(Name = "h-captcha-response")]
    public string hCaptchaResponse { get; set; }
    public string siteKey => Configuration.HCaptchaPublicKey;
    public string? errorMessage { get; set; }
    public string? successMessage { get; set; }
    public string? verificationPhrase { get; private set; }
    [BindProperty]
    public string? passwordResetId { get; set; }
    [BindProperty]
    public string? newPassword { get; set; }

    public IActionResult OnGet()
    {
        return new RedirectResult("/auth/discord/login");
    }

    public IActionResult OnPost()
    {
        return new RedirectResult("/auth/discord/login");
    }
}
