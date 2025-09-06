import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, Loader2, TrendingUp, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface PowerSearchProps {
  onSearch: (results: any) => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
}

export default function PowerSearch({ onSearch, onLoading, className }: PowerSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    'Duplex Board 300 GSM',
    'Art Paper 130 GSM',
    'Kraft Paper',
    'Maplitho 80 GSM',
    'Newsprint 45 GSM',
    'Copier Paper A4'
  ]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (searchText: string) => {
      if (searchText.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchText)}`);
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.suggestions);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }, 300),
    []
  );

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    fetchSuggestions(value);
  };

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    onLoading?.(true);
    setShowSuggestions(false);

    try {
      // Save to recent searches
      const updatedRecent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updatedRecent);
      localStorage.setItem('recentSearches', JSON.stringify(updatedRecent));

      // Perform the search
      const response = await fetch('/api/search/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          page: 1,
          pageSize: 20
        })
      });
      const data = await response.json();

      if (data) {
        onSearch(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
      onLoading?.(false);
    }
  };

  // Handle search submit
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(query);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    performSearch(suggestion);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  };

  // Smart search examples
  const searchExamples = [
    { text: 'GSM 200-300', icon: Filter, color: 'text-blue-600' },
    { text: 'Duplex Board', icon: TrendingUp, color: 'text-green-600' },
    { text: '70x100 cm', icon: Sparkles, color: 'text-purple-600' },
  ];

  return (
    <div className={cn('relative w-full', className)}>
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by product, brand, GSM, dimensions... (e.g., 'Duplex 300 GSM' or '70x100')"
            className="pl-10 pr-32 h-12 text-base border-2 focus:border-blue-500 transition-colors"
            data-testid="power-search-input"
          />
          
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            type="submit"
            disabled={isSearching}
            className="absolute right-1 h-10 px-4 bg-blue-600 hover:bg-blue-700"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Search suggestions dropdown */}
      {showSuggestions && (query.length > 0 || recentSearches.length > 0 || popularSearches.length > 0) && (
        <Card className="absolute z-50 w-full mt-2 p-0 shadow-lg border-2">
          <div className="max-h-96 overflow-y-auto">
            {/* Autocomplete suggestions */}
            {suggestions.length > 0 && (
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Suggestions</p>
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors flex items-center justify-between group"
                  >
                    <span className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <span dangerouslySetInnerHTML={{ __html: suggestion.text }} />
                    </span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Score: {suggestion.score?.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Smart search examples (when no query) */}
            {!query && (
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Try searching for</p>
                <div className="flex flex-wrap gap-2 px-2">
                  {searchExamples.map((example, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSuggestionClick(example.text)}
                    >
                      <example.icon className={cn('h-3 w-3 mr-1', example.color)} />
                      {example.text}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recent searches */}
            {recentSearches.length > 0 && !query && (
              <div className="p-2 border-b">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Recent searches</p>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(search)}
                    className="w-full text-left px-3 py-2 hover:bg-accent rounded-md transition-colors flex items-center gap-2"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{search}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Popular searches */}
            {!query && (
              <div className="p-2">
                <p className="text-xs font-medium text-muted-foreground px-2 mb-1">Popular searches</p>
                <div className="flex flex-wrap gap-2 px-2">
                  {popularSearches.map((search, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => handleSuggestionClick(search)}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {search}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Search tips */}
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI-powered search
        </span>
        <span>•</span>
        <span>Search by: Product, Brand, GSM range (200-300), Dimensions, Company</span>
        <span>•</span>
        <span>Fuzzy matching enabled</span>
      </div>
    </div>
  );
}