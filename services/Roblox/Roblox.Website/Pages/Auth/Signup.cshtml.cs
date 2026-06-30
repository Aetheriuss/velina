using Microsoft.AspNetCore.Mvc;

namespace Roblox.Website.Pages.Auth;

// Registration is Discord-only. The legacy application/invite signup form has
// been removed; this page just redirects to Discord login.
public class Signup : RobloxPageModel
{
    public IActionResult OnGet()
    {
        return Redirect("/auth/discord/login");
    }

    public IActionResult OnPost()
    {
        return Redirect("/auth/discord/login");
    }
}
