using Roblox.Dto.Users;
using Roblox.Logging;
using Roblox.Models.Sessions;
using Roblox.Models.Users;

namespace Roblox.Services;


public class UserSessionsCache : GenericMemoryCache<string, SessionEntry?>
{
    
}

public class GetUserByIdCache : GenericMemoryCache<long, UserInfo>
{
    // short ttl so we don't risk having banned users online for too long
    public GetUserByIdCache() : base(TimeSpan.FromSeconds(30))
    {
        
    }
}

public class UserThemeCache : GenericMemoryCache<long, ThemeTypes>
{
    
}

public class UserYearCache : GenericMemoryCache<long, WebsiteYear>
{
    public UserYearCache()
    {
        
    }
}