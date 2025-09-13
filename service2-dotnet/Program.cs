using System.Text;
using System.Text.RegularExpressions;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var startTime = DateTimeOffset.UtcNow;
string vstoragePath = Environment.GetEnvironmentVariable("VSTORAGE_PATH") ?? "/app/vstorage/log.txt";
string storageBase = Environment.GetEnvironmentVariable("STORAGE_BASE_URL") ?? "http://storage:8080";

// helper: root free space in MB
long GetRootFreeMb()
{
    try
    {
        var root = Path.GetPathRoot(Path.GetFullPath("/")) ?? "/";
        var drive = DriveInfo.GetDrives().FirstOrDefault(d => d.RootDirectory.FullName == root) ??
                    DriveInfo.GetDrives().FirstOrDefault(); // fallback
        if (drive != null && drive.IsReady)
        {
            return drive.AvailableFreeSpace / (1024 * 1024);
        }
    }
    catch { }
    return -1;
}

string Record2()
{
    var ts = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'");
    var uptimeHours = (long)(DateTimeOffset.UtcNow - startTime).TotalHours;
    var freeMb = GetRootFreeMb();
    return $"Timestamp2 {ts}: uptime {uptimeHours} hours, free disk in root: {freeMb} MBytes";
}

async Task AppendVStorage(string line)
{
    Directory.CreateDirectory(Path.GetDirectoryName(vstoragePath)!);
    await File.AppendAllTextAsync(vstoragePath, line + "\n", Encoding.UTF8);
}

async Task PostToStorage(string line)
{
    using var http = new HttpClient();
    using var content = new StringContent(line, Encoding.UTF8, "text/plain");
    var resp = await http.PostAsync($"{storageBase}/log", content);
    resp.EnsureSuccessStatusCode();
}

app.MapGet("/status", async () =>
{
    var rec = Record2();
    await PostToStorage(rec);
    await AppendVStorage(rec);
    return Results.Text(rec, "text/plain", Encoding.UTF8);
});

app.Run();
