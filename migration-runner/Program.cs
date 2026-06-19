using System;
using System.Data;
using System.IO;
using System.Linq;
using Dapper;
using Microsoft.Data.Sqlite;

var dbPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
    "工程管家", "engineering.db");

Console.WriteLine($"检查 projects 表结构:");

var connStr = $"Data Source={dbPath}";

using var conn = new SqliteConnection(connStr);
conn.Open();

var columns = conn.Query($"PRAGMA table_info(projects)").ToList();
Console.WriteLine("\nprojects 表列:");
foreach (dynamic col in columns)
{
    Console.WriteLine($"  {col.name}: {col.type}");
}

var hasProjectManagerId = columns.Any<dynamic>(c => (string)c.name == "project_manager_id");
Console.WriteLine($"\nproject_manager_id 存在: {hasProjectManagerId}");

if (!hasProjectManagerId)
{
    Console.WriteLine("\n添加 project_manager_id 列...");
    try
    {
        conn.Execute("ALTER TABLE projects ADD COLUMN project_manager_id INTEGER");
        Console.WriteLine("添加成功");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"添加失败: {ex.Message}");
    }
}

return 0;
