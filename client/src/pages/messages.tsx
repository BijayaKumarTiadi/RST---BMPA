import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { MessageCircle, Package, User, Clock, Send, ArrowLeft, MoreVertical, Phone, Video } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Simple Avatar components
const Avatar = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`inline-flex items-center justify-center rounded-full bg-muted ${className}`}>
    {children}
  </div>
);

const AvatarFallback = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium ${className}`}>
    {children}
  </div>
);

const AvatarInitials = ({ name }: { name: string }) => {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  return <span>{initials}</span>;
};

export default function Messages() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatsData, isLoading } = useQuery({
    queryKey: ['/api/chats'],
    queryFn: async () => {
      const response = await fetch(`/api/chats`);
      if (!response.ok) throw new Error('Failed to fetch chats');
      return response.json();
    },
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll every 5 seconds for updates
  });

  // Fetch messages for selected chat
  const { data: chatData, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/chat', selectedChatId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${selectedChatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat');
      return response.json();
    },
    enabled: !!selectedChatId && isAuthenticated,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      return apiRequest('POST', `/api/chat/${selectedChatId}/messages`, {
        message
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat', selectedChatId, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate({ message: message.trim() });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins < 1 ? 'Just now' : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData?.messages]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access your messages.</p>
            <Button onClick={() => setLocation('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const chats = chatsData?.chats || [];
  const selectedChat = selectedChatId ? chats.find(chat => chat.id === selectedChatId) : null;
  const messages = chatData?.messages || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="h-[calc(100vh-64px)] flex">
        {/* Left Sidebar - Chat List */}
        <div className="w-80 border-r border-border bg-card">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground" data-testid="text-messages-title">
              Messages
            </h2>
            <p className="text-sm text-muted-foreground">
              {chats.length} conversation{chats.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="overflow-y-auto h-[calc(100vh-128px)]">
            {chats.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start conversations with sellers by viewing products and clicking "Message Seller"
                </p>
                <Button onClick={() => setLocation('/marketplace')} data-testid="button-browse-products">
                  Browse Products
                </Button>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {chats.map((chat: any) => {
                  const otherParty = user?.id === chat.buyer_id ? chat.seller_name : chat.buyer_name;
                  const otherCompany = user?.id === chat.buyer_id ? chat.seller_company : chat.buyer_company;
                  const isSelected = selectedChatId === chat.id;
                  
                  return (
                    <div
                      key={chat.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedChatId(chat.id)}
                      data-testid={`chat-item-${chat.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback>
                            <AvatarInitials name={otherParty} />
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium text-foreground truncate" data-testid={`text-chat-name-${chat.id}`}>
                              {otherParty}
                            </h4>
                            <div className="flex items-center gap-2">
                              {chat.updated_at && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(chat.updated_at)}
                                </span>
                              )}
                              {chat.unread_count > 0 && (
                                <Badge className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs" data-testid={`badge-unread-${chat.id}`}>
                                  {chat.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {otherCompany}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">
                              {chat.product_title}
                            </span>
                          </div>
                          {chat.last_message && (
                            <p className="text-sm text-muted-foreground truncate mt-1" data-testid={`text-last-message-${chat.id}`}>
                              {chat.last_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Chat View */}
        <div className="flex-1 flex flex-col">
          {!selectedChatId ? (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <MessageCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Select a conversation</h3>
                <p className="text-muted-foreground">Choose a chat from the sidebar to start messaging</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedChatId(null)}
                      className="md:hidden"
                      data-testid="button-back-mobile"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    
                    <Avatar>
                      <AvatarFallback>
                        <AvatarInitials name={user?.id === selectedChat?.buyer_id ? selectedChat?.seller_name : selectedChat?.buyer_name} />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-foreground" data-testid="text-chat-header-name">
                        {user?.id === selectedChat?.buyer_id ? selectedChat?.seller_name : selectedChat?.buyer_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user?.id === selectedChat?.buyer_id ? selectedChat?.seller_company : selectedChat?.buyer_company}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Active
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20" data-testid="chat-messages">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isOwnMessage = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          isOwnMessage 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-card border border-border text-foreground'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                          <div className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border bg-card">
                <div className="flex gap-2">
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[44px] max-h-32 resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    data-testid="input-message"
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    size="sm"
                    className="px-4"
                    data-testid="button-send"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}