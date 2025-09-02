import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Navigation from "@/components/navigation";
import { MessageCircle, Package, User, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  const chats = chatsData?.chats || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Messages</h1>
          <p className="text-muted-foreground">
            {user?.role === 'buyer' ? 'Your conversations with sellers' : 'Your conversations with buyers'}
          </p>
        </div>

        {chats.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
              <p className="text-muted-foreground mb-4">
                {user?.role === 'buyer' 
                  ? 'Start a conversation by contacting sellers from product pages'
                  : 'Buyers will appear here when they contact you about your products'
                }
              </p>
              <Button onClick={() => setLocation('/marketplace')} data-testid="button-browse-marketplace">
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {chats.map((chat: any) => {
              const otherParty = user?.member_id === chat.buyer_id 
                ? { name: chat.seller_name, company: chat.seller_company, type: 'seller' }
                : { name: chat.buyer_name, company: chat.buyer_company, type: 'buyer' };

              return (
                <Card 
                  key={chat.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/20 hover:border-l-primary"
                  onClick={() => setLocation(`/chat/${chat.id}`)}
                  data-testid={`card-chat-${chat.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          <AvatarInitials name={otherParty.name} />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-foreground truncate" data-testid={`text-name-${chat.id}`}>
                            {otherParty.name}
                          </h3>
                          <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`text-time-${chat.id}`}>
                            {formatTime(chat.updated_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate mb-2" data-testid={`text-company-${chat.id}`}>
                          {otherParty.company}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {otherParty.type}
                          </Badge>
                          {chat.product_title && (
                            <Badge variant="secondary" className="text-xs">
                              <Package className="h-3 w-3 mr-1" />
                              {chat.product_title}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {chat.last_message && (
                    <>
                      <Separator className="mx-6" />
                      <CardContent className="pt-3 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate flex-1" data-testid={`text-last-message-${chat.id}`}>
                            {chat.last_message}
                          </p>
                          {chat.unread_count > 0 && (
                            <Badge className="ml-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 text-xs" data-testid={`badge-unread-${chat.id}`}>
                              {chat.unread_count}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}