using System.Net;
using System.Text.RegularExpressions;
using Roblox.Logging;
using Roblox.Models.Staff;
using Roblox.Models.Users;

namespace Roblox.Dto.Users;

public class UserId
{
    public long userId { get; set; }
}

public class UserIdWithUsername
{
    public long userId { get; set; }
    public string username { get; set; }
}

public class MultiGetEntry
{
    public long id { get; set; }
    public string name { get; set; }
    public string requestedName { get; set; }
    public string displayName { get; set; }
}

public class MultiGetDbEntry
{
    public long id { get; set; }
    public string username { get; set; }
    public string? requestedUsername { get; set; }
}

public class UserInfo
{
    public long userId { get; set; }
    public string username { get; set; }
    public AccountStatus accountStatus { get; set; }
    public DateTime created { get; set; }
    public bool isAdmin { get; set; }
    public bool isModerator { get; set; }
    public string description { get; set; }

    public bool IsDeleted()
    {
        return accountStatus != AccountStatus.Ok && accountStatus != AccountStatus.MustValidateEmail &&
               accountStatus != AccountStatus.Suppressed;
    }
}

public class MultiGetAccountStatusEntry
{
    public AccountStatus accountStatus { get; set; }
    public long userId { get; set; }

    public bool IsDeleted()
    {
        return accountStatus == AccountStatus.Deleted || accountStatus == AccountStatus.Forgotten ||
               accountStatus == AccountStatus.Poisoned;
    }
}

public class SessionEntry
{
    public long userId { get; set; }
    public DateTime createdAt { get; set; }
}

public class MultiGetRequest
{
    public IEnumerable<long> userIds { get; set; }
}

public class MultiGetByNameRequest
{
    public IEnumerable<string> usernames { get; set; }
}

public class StatusEntry
{
    public string? status { get; set; }
}

public class GeneralPrivacyEntry
{
    public GeneralPrivacy privacy { get; set; }
}

public class AccountStatusEntry
{
    public AccountStatus status { get; set; }
}

public class TradeFilterEntry
{
    public TradeQualityFilter filter { get; set; }
}

public class PreviousUsernameEntry
{
    public string username { get; set; }
    public DateTime createdAt { get; set; }
}

public class UserLotteryEntry
{
    public long userId { get; set; }
    public string username { get; set; }
    public DateTime onlineAt { get; set; }
}


public class User18OrOver
{
    public bool is18Plus { get; set; }
}

public class UserInviteEntry
{
    public string id { get; set; }
    public long? userId { get; set; }
    public long authorId { get; set; }
    public DateTime createdAt { get; set; }
    public DateTime updatedAt { get; set; }
}

public class StaffUserStatusEntry
{
    public long userId { get; set; }
    public string post { get; set; }
    public string username { get; set; }
    public long id { get; set; }
    public DateTime createdAt { get; set; }
}

public class StaffUserPermissionEntry
{
    public long userId { get; set; }
    public Access permission { get; set; }
}

public class UserSessionExpirationEntry
{
    public DateTime? sessionExpiredAt { get; set; }
}

public class PasswordResetEntry
{
    public string id { get; set; }
    public long userId { get; set; }
    public PasswordResetState status { get; set; }
    public DateTime createdAt { get; set; }
}