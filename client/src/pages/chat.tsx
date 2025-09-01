import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/navigation";
import { ObjectUploader } from "@/components/ObjectUploader";
import { ArrowLeft, Send, Image, Paperclip, MoreVertical, Phone, Video } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
// Simple Avatar components for chat
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function Chat() {
  const { chatId } = useParams();
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatData, isLoading } = useQuery({
    queryKey: ['/api/chat', chatId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/chat/${chatId}/messages`);
      if (!response.ok) throw new Error('Failed to fetch chat');
      return response.json();
    },
    enabled: !!chatId && isAuthenticated,
    refetchInterval: 2000, // Poll every 2 seconds for new messages
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, imageUrl }: { message?: string; imageUrl?: string }) => {
      return apiRequest('POST', `/api/chat/${chatId}/messages`, {
        message,
        messageType: imageUrl ? 'image' : 'text',
        imageUrl
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/chat', chatId, 'messages'] });
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

  const handleImageUpload = async () => {
    // This will be triggered by the ObjectUploader component
    return {
      method: 'PUT' as const,
      url: await apiRequest('POST', '/api/objects/upload').then(res => res.uploadURL)
    };
  };

  const handleImageComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadUrl = result.successful[0].uploadURL;
      sendMessageMutation.mutate({ imageUrl: uploadUrl });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatData?.messages]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleImageLoad = (imageUrl: string) => {
    if (imageUrl?.startsWith('https://storage.googleapis.com/replit-objstore-')) {
      return `/api/images/${imageUrl.split('/.private/')[1]}`;
    }
    return imageUrl;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Authentication Required</h1>
            <p className="text-muted-foreground mb-4">Please log in to access the chat.</p>
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

  if (!chatData?.success || !chatData?.chat) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Chat Not Found</h1>
            <Button onClick={() => setLocation('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { chat, messages = [] } = chatData;
  const isBuyer = user?.id === chat.buyer_id;
  const otherParty = isBuyer ? 'Seller' : 'Buyer';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Chat Header */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation('/')}
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>
                      <AvatarInitials name={otherParty} />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-lg font-semibold" data-testid="text-chat-title">
                      Chat with {otherParty}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Product Discussion
                    </p>
                  </div>
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
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card className="flex flex-col h-[600px]">
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">Start the conversation</h3>
                <p className="text-muted-foreground">Send a message to begin discussing this product.</p>
              </div>
            ) : (
              <>
                {messages.map((msg: any, index: number) => {
                  const isCurrentUser = msg.sender_id === user?.id;
                  const showDate = index === 0 || 
                    formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-4">
                          <span className="bg-muted px-3 py-1 rounded-full text-sm text-muted-foreground">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}>
                        <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                          {!isCurrentUser && (
                            <div className="flex items-center gap-2 mb-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  <AvatarInitials name={msg.sender_name || otherParty} />
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {msg.sender_name || otherParty}
                              </span>
                            </div>
                          )}
                          
                          <div
                            className={`rounded-lg px-3 py-2 ${
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-foreground'
                            }`}
                            data-testid={`message-${msg.id}`}
                          >
                            {msg.message_type === 'image' && msg.image_url ? (
                              <div className="space-y-2">
                                <img
                                  src={handleImageLoad(msg.image_url)}
                                  alt="Shared image"
                                  className="rounded-lg max-w-full h-auto"
                                  onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y5ZmFmYiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjU3Mzg0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2U8L3RleHQ+PC9zdmc+';
                                  }}
                                />
                                {msg.message && (
                                  <p className="text-sm">{msg.message}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm">{msg.message}</p>
                            )}
                          </div>
                          
                          <div className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatTime(msg.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </CardContent>

          <Separator />

          {/* Message Input */}
          <div className="p-4">
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={5242880} // 5MB
                  onGetUploadParameters={handleImageUpload}
                  onComplete={handleImageComplete}
                  buttonClassName="p-2 h-9 w-9"
                >
                  <Image className="h-4 w-4" />
                </ObjectUploader>
                
                <Button variant="ghost" size="sm" className="p-2 h-9 w-9">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="min-h-9 max-h-32 resize-none"
                  data-testid="input-message"
                />
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="h-9"
                data-testid="button-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}