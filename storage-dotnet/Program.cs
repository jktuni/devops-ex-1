using System.Text;
using System.IO;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

string storageFilePath = Environment.GetEnvironmentVariable("STORAGE_FILE_PATH") ?? "/app/data/storage.log";
Directory.CreateDirectory(Path.GetDirectoryName(storageFilePath)!);

app.MapPost("/log", async (HttpRequest req) =>
{
    using var reader = new StreamReader(req.Body, Encoding.UTF8);
    var body = await reader.ReadToEndAsync();
    if (string.IsNullOrWhiteSpace(body))
        return Results.BadRequest("Empty body");
    await File.AppendAllTextAsync(storageFilePath, body.TrimEnd('\n') + "\n", Encoding.UTF8);
    return Results.Ok();
});

app.MapGet("/log", async () =>
{
    if (!File.Exists(storageFilePath)) return Results.Text("", "text/plain", Encoding.UTF8);
    var text = await File.ReadAllTextAsync(storageFilePath, Encoding.UTF8);
    return Results.Text(text, "text/plain", Encoding.UTF8);
});

app.MapDelete("/log", () =>
{
    if (File.Exists(storageFilePath)) File.Delete(storageFilePath);
    return Results.Ok("Log cleared");
});

app.Run();
