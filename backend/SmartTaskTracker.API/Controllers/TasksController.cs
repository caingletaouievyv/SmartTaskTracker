using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Helpers;
using SmartTaskTracker.API.Services;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;
    private readonly TaskMemoryService _taskMemoryService;
    private readonly NaturalLanguageTaskService _naturalLanguageTaskService;
    private readonly IWebHostEnvironment _env;

    public TasksController(TaskService taskService, TaskMemoryService taskMemoryService, NaturalLanguageTaskService naturalLanguageTaskService, IWebHostEnvironment env)
    {
        _taskService = taskService;
        _taskMemoryService = taskMemoryService;
        _naturalLanguageTaskService = naturalLanguageTaskService;
        _env = env;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<TaskDto>>> GetTasks(
        [FromQuery] string? search, 
        [FromQuery] string? status, 
        [FromQuery] string? sortBy, 
        [FromQuery] bool includeArchived = false,
        [FromQuery] string? dueDate = null,
        [FromQuery] int? priority = null,
        [FromQuery] string? tags = null)
    {
        var tasks = await _taskService.GetTasksAsync(GetUserId(), search, status, sortBy, includeArchived, dueDate, priority, tags);
        return Ok(tasks);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskDto>> GetTask(int id)
    {
        var task = await _taskService.GetTaskByIdAsync(id, GetUserId());
        if (task == null) return NotFound();
        return Ok(task);
    }

    [HttpPost]
    public async Task<ActionResult<TaskDto>> CreateTask([FromBody] CreateTaskDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var task = await _taskService.CreateTaskAsync(dto, GetUserId());
        return CreatedAtAction(nameof(GetTask), new { id = task.Id }, task);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateTaskDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _taskService.UpdateTaskAsync(id, dto, GetUserId());
        return result switch
        {
            TaskService.UpdateTaskResult.Success => NoContent(),
            TaskService.UpdateTaskResult.BlockedByDependencies => BadRequest(new { message = "This task is blocked. Complete its dependencies first." }),
            _ => NotFound(new { message = "Task not found" })
        };
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var success = await _taskService.DeleteTaskAsync(id, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<TaskAnalyticsDto>> GetAnalytics()
    {
        var analytics = await _taskService.GetAnalyticsAsync(GetUserId());
        return Ok(analytics);
    }

    [HttpGet("reminders")]
    public async Task<ActionResult<RemindersResponseDto>> GetReminders([FromQuery] int hoursAhead = 24)
    {
        var reminders = await _taskService.GetRemindersAsync(GetUserId(), hoursAhead);
        return Ok(reminders);
    }

    [HttpGet("embedding-check")]
    public async Task<ActionResult<object>> EmbeddingCheck()
    {
        if (!_env.IsDevelopment()) return NotFound();
        var (ok, reason) = await _taskMemoryService.GetEmbeddingDiagnosticAsync();
        return Ok(new { ok, reason });
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<TaskSearchResultDto>>> Search(
        [FromQuery] string? query,
        [FromQuery] TaskIntent? intent = null,
        [FromQuery] int? topK = null,
        [FromQuery] double? threshold = null)
    {
        var useSemantic = intent != TaskIntent.Keyword;
        if (useSemantic)
        {
            var results = await _taskMemoryService.SearchSemanticAsync(GetUserId(), query ?? "", topK, threshold);
            if (results.Count == 0 && !string.IsNullOrWhiteSpace(query))
            {
                var tasks = await _taskService.GetTasksAsync(GetUserId(), query, null, null, false);
                results = tasks.Select(t => new TaskSearchResultDto { Task = t, Score = null }).ToList();
                Response.Headers.Append("X-Search-Fallback", "keyword");
            }
            return Ok(results);
        }
        var keywordTasks = await _taskService.GetTasksAsync(GetUserId(), query, null, null, false);
        return Ok(keywordTasks.Select(t => new TaskSearchResultDto { Task = t, Score = null }).ToList());
    }

    [HttpGet("ai-suggestions")]
    public async Task<ActionResult<List<TaskSuggestionDto>>> GetAiSuggestions([FromQuery] int? topK = null)
    {
        var results = await _taskService.GetSuggestedNextAsync(GetUserId(), topK);
        return Ok(results);
    }

    /// <summary>State: User sent free text. Intent: Get structured task for create form. Action: LLM parse or keyword fallback.</summary>
    [HttpPost("from-natural-language")]
    public async Task<ActionResult<CreateTaskDto>> ParseNaturalLanguage([FromBody] ParseNaturalLanguageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            return BadRequest(new { message = "Text is required" });
        var parsed = await _naturalLanguageTaskService.ParseAsync(request.Text.Trim());
        return Ok(parsed);
    }

    [HttpPost("bulk-delete")]
    public async Task<ActionResult> BulkDeleteTasks([FromBody] BulkOperationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var count = await _taskService.BulkDeleteTasksAsync(dto.TaskIds, GetUserId());
        return Ok(new { message = $"{count} task(s) deleted", count });
    }

    [HttpPost("bulk-complete")]
    public async Task<ActionResult> BulkCompleteTasks([FromBody] BulkOperationDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var count = await _taskService.BulkCompleteTasksAsync(dto.TaskIds, GetUserId());
        return Ok(new { message = $"{count} task(s) completed", count });
    }

    [HttpPost("{id}/archive")]
    public async Task<IActionResult> ArchiveTask(int id)
    {
        var success = await _taskService.ArchiveTaskAsync(id, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/unarchive")]
    public async Task<IActionResult> UnarchiveTask(int id)
    {
        var success = await _taskService.UnarchiveTaskAsync(id, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("{id}/history")]
    public async Task<ActionResult<List<TaskHistoryDto>>> GetTaskHistory(int id)
    {
        var history = await _taskService.GetTaskHistoryAsync(id, GetUserId());
        return Ok(history);
    }

    [HttpPost("import-csv")]
    public async Task<ActionResult> ImportTasksFromCsv([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "File must be a CSV file" });

        using var reader = new StreamReader(file.OpenReadStream());
        var csvContent = await reader.ReadToEndAsync();

        var imported = await _taskService.ImportTasksFromCsvAsync(csvContent, GetUserId());
        return Ok(new { message = $"{imported} task(s) imported successfully", count = imported });
    }

    [HttpPost("{id}/dependencies")]
    public async Task<IActionResult> AddDependency(int id, [FromBody] AddDependencyDto dto)
    {
        var (success, errorMessage) = await _taskService.AddDependencyAsync(id, dto.DependsOnTaskId, GetUserId());
        if (!success) return BadRequest(new { message = errorMessage ?? "Failed to add dependency" });
        return NoContent();
    }

    [HttpDelete("{id}/dependencies/{dependsOnTaskId}")]
    public async Task<IActionResult> RemoveDependency(int id, int dependsOnTaskId)
    {
        var success = await _taskService.RemoveDependencyAsync(id, dependsOnTaskId, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpGet("{id}/subtasks")]
    public async Task<ActionResult<List<TaskDto>>> GetSubtasks(int id)
    {
        var subtasks = await _taskService.GetSubtasksAsync(id, GetUserId());
        return Ok(subtasks);
    }

    [HttpPost("{id}/subtasks")]
    public async Task<ActionResult<TaskDto>> CreateSubtask(int id, [FromBody] CreateTaskDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        dto.ParentTaskId = id;
        var subtask = await _taskService.CreateTaskAsync(dto, GetUserId());
        return CreatedAtAction(nameof(GetTask), new { id = subtask.Id }, subtask);
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderTasks([FromBody] ReorderTasksDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var success = await _taskService.UpdateTaskOrderAsync(dto.TaskIds, GetUserId());
        if (!success) return BadRequest(new { message = "Failed to reorder tasks" });
        return NoContent();
    }
}
