using System.Collections.Generic;

namespace SmartTaskTracker.API.Helpers;

public class LRUCache<TKey, TValue> where TKey : notnull
{
    private readonly int _capacity;
    private readonly Dictionary<TKey, LinkedListNode<(TKey Key, TValue Value)>> _map;
    private readonly LinkedList<(TKey Key, TValue Value)> _order;
    private readonly object _lock = new();

    public LRUCache(int capacity)
    {
        _capacity = capacity > 0 ? capacity : 100;
        _map = new Dictionary<TKey, LinkedListNode<(TKey, TValue)>>(_capacity);
        _order = new LinkedList<(TKey, TValue)>();
    }

    public TValue? Get(TKey key)
    {
        lock (_lock)
        {
            if (!_map.TryGetValue(key, out var node)) return default;
            _order.Remove(node);
            _order.AddLast(node);
            return node.Value.Value;
        }
    }

    public void Remove(TKey key)
    {
        lock (_lock)
        {
            if (!_map.TryGetValue(key, out var node)) return;
            _order.Remove(node);
            _map.Remove(key);
        }
    }

    public void Set(TKey key, TValue value)
    {
        lock (_lock)
        {
            if (_map.TryGetValue(key, out var node))
            {
                _order.Remove(node);
                node.Value = (key, value);
                _order.AddLast(node);
                return;
            }
            if (_map.Count >= _capacity)
            {
                var first = _order.First!;
                _order.RemoveFirst();
                _map.Remove(first.Value.Key);
            }
            var newNode = _order.AddLast((key, value));
            _map[key] = newNode;
        }
    }
}
