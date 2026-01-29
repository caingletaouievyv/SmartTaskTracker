using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Models;
using TaskModel = SmartTaskTracker.API.Models.Task;

namespace SmartTaskTracker.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }
    public DbSet<TaskModel> Tasks { get; set; }
    public DbSet<TaskTemplate> TaskTemplates { get; set; }
    public DbSet<TaskHistory> TaskHistories { get; set; }
    public DbSet<TaskDependency> TaskDependencies { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<TaskTag> TaskTags { get; set; }
    public DbSet<UserSettings> UserSettings { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure TaskTag many-to-many relationship
        modelBuilder.Entity<TaskTag>()
            .HasKey(tt => new { tt.TaskId, tt.TagId });

        modelBuilder.Entity<TaskTag>()
            .HasOne(tt => tt.Task)
            .WithMany(t => t.TaskTags)
            .HasForeignKey(tt => tt.TaskId);

        modelBuilder.Entity<TaskTag>()
            .HasOne(tt => tt.Tag)
            .WithMany(t => t.TaskTags)
            .HasForeignKey(tt => tt.TagId);

        // Configure TaskDependency many-to-many relationship
        modelBuilder.Entity<TaskDependency>()
            .HasKey(td => new { td.TaskId, td.DependsOnTaskId });

        modelBuilder.Entity<TaskDependency>()
            .HasOne(td => td.Task)
            .WithMany()
            .HasForeignKey(td => td.TaskId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<TaskDependency>()
            .HasOne(td => td.DependsOnTask)
            .WithMany()
            .HasForeignKey(td => td.DependsOnTaskId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

