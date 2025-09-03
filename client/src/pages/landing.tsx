import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/navigation";
import { Search, Mic, Users, Package, IndianRupee, TrendingUp, Shield, Clock, Code, LifeBuoy, Printer, ShoppingCart, Cog, ChartLine, GraduationCap, Handshake, MapPin, Phone, Mail, Clock as ClockIcon } from "lucide-react";

export default function Landing() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-gradient text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Stock Laabh Trading Platform
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Connect traders and investors in the professional marketplace
            </p>
            <p className="text-lg text-blue-200 max-w-3xl mx-auto">
              Professional trading platform for clearing excess stock, finding quality materials, and connecting with trusted business partners.
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-lg p-6 mb-8">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search printing materials, papers, inks, equipment..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="search-input"
                    />
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2">
                  <select className="px-4 py-2 border border-border rounded-md focus:ring-2 focus:ring-ring">
                    <option>All Categories</option>
                    <option>Paper & Board</option>
                    <option>Printing Inks</option>
                    <option>Equipment</option>
                    <option>Chemicals</option>
                    <option>Packaging Materials</option>
                  </select>
                  <Button data-testid="search-button">
                    <Search className="mr-2 h-4 w-4" />
                    Search
                  </Button>
                  <Button variant="outline" size="icon" data-testid="voice-search-button">
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="glass-card rounded-lg p-4">
                <div className="text-2xl font-bold" data-testid="stat-members">2,500+</div>
                <div className="text-sm text-blue-200">Active Members</div>
              </div>
              <div className="glass-card rounded-lg p-4">
                <div className="text-2xl font-bold" data-testid="stat-items">15,000+</div>
                <div className="text-sm text-blue-200">Stock Items</div>
              </div>
              <div className="glass-card rounded-lg p-4">
                <div className="text-2xl font-bold" data-testid="stat-transactions">₹50Cr+</div>
                <div className="text-sm text-blue-200">Transactions</div>
              </div>
              <div className="glass-card rounded-lg p-4">
                <div className="text-2xl font-bold" data-testid="stat-success-rate">98%</div>
                <div className="text-sm text-blue-200">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete Marketplace Solution
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              From stock management to secure transactions, everything you need for efficient printing industry trading
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow" data-testid="feature-suppliers">
              <CardHeader>
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>For Suppliers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Manage your inventory, reach multiple buyers, and streamline your distribution network.</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center"><Shield className="mr-2 h-4 w-4 text-primary" />Inventory Management</li>
                  <li className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Buyer Network Access</li>
                  <li className="flex items-center"><Clock className="mr-2 h-4 w-4 text-primary" />Automated Notifications</li>
                  <li className="flex items-center"><TrendingUp className="mr-2 h-4 w-4 text-primary" />Analytics Dashboard</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="feature-buyers">
              <CardHeader>
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
                  <ShoppingCart className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle>For Buyers</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Find quality stock at competitive prices with verified suppliers across the network.</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center"><Search className="mr-2 h-4 w-4 text-primary" />Advanced Search & Filters</li>
                  <li className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Price Comparison</li>
                  <li className="flex items-center"><Shield className="mr-2 h-4 w-4 text-primary" />Secure Payment Gateway</li>
                  <li className="flex items-center"><Package className="mr-2 h-4 w-4 text-primary" />Order Tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow" data-testid="feature-admin">
              <CardHeader>
                <div className="w-12 h-12 bg-chart-1 rounded-lg flex items-center justify-center mb-4">
                  <Cog className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Admin Control</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">Comprehensive platform management with detailed analytics and member oversight.</p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center"><Users className="mr-2 h-4 w-4 text-primary" />Member Management</li>
                  <li className="flex items-center"><TrendingUp className="mr-2 h-4 w-4 text-primary" />Transaction Monitoring</li>
                  <li className="flex items-center"><IndianRupee className="mr-2 h-4 w-4 text-primary" />Payment Reconciliation</li>
                  <li className="flex items-center"><ChartLine className="mr-2 h-4 w-4 text-primary" />Platform Analytics</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* API Documentation Preview */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Professional API Integration
            </h2>
            <p className="text-xl text-muted-foreground">
              Comprehensive REST API with full documentation for seamless integration
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Available API Endpoints</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-border rounded-lg p-4" data-testid="api-endpoint-register">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="bg-chart-2 text-white">POST</Badge>
                      <code className="text-sm font-mono">/api/auth/register</code>
                    </div>
                    <span className="text-xs text-muted-foreground">User Registration</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Register new user with OTP verification</p>
                </div>
                
                <div className="border border-border rounded-lg p-4" data-testid="api-endpoint-listings">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="bg-primary">GET</Badge>
                      <code className="text-sm font-mono">/api/stock/listings</code>
                    </div>
                    <span className="text-xs text-muted-foreground">Stock Listings</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Retrieve paginated stock listings with filters</p>
                </div>
                
                <div className="border border-border rounded-lg p-4" data-testid="api-endpoint-orders">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <Badge variant="secondary" className="bg-chart-1 text-white">PUT</Badge>
                      <code className="text-sm font-mono">/api/orders/update</code>
                    </div>
                    <span className="text-xs text-muted-foreground">Order Management</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Update order status and tracking information</p>
                </div>
                
                <Button className="w-full" data-testid="view-api-docs-button">
                  <Code className="mr-2 h-4 w-4" />
                  View Full API Documentation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration Example</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 rounded-lg p-4 text-green-400 font-mono text-sm overflow-x-auto">
                  <div className="text-gray-400 mb-2">// Example API call for stock listings</div>
                  <div><span className="text-blue-400">const</span> response = <span className="text-blue-400">await</span> <span className="text-yellow-400">fetch</span>(<span className="text-red-400">'https://api.bmpa-stock.com/api/stock/listings'</span>, {"{"}</div>
                  <div className="ml-4">method: <span className="text-red-400">'GET'</span>,</div>
                  <div className="ml-4">headers: {"{"}</div>
                  <div className="ml-8"><span className="text-red-400">'Authorization'</span>: <span className="text-red-400">'Bearer YOUR_API_KEY'</span>,</div>
                  <div className="ml-8"><span className="text-red-400">'Content-Type'</span>: <span className="text-red-400">'application/json'</span></div>
                  <div className="ml-4">{"}"}</div>
                  <div>{"}"});</div>
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm">Secure API key authentication</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-chart-2" />
                    <span className="text-sm">Rate limiting: 1000 requests/hour</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Code className="h-4 w-4 text-chart-1" />
                    <span className="text-sm">RESTful API with JSON responses</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <LifeBuoy className="h-4 w-4 text-chart-4" />
                    <span className="text-sm">24/7 developer support</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BMPA About Section */}
      <section className="py-20 bg-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              About BMPA
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Bombay Master Printers Association - Leading the printing industry with innovation, advocacy, and professional excellence since decades
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600" 
                alt="Professional corporate meeting room" 
                className="rounded-lg shadow-lg w-full h-auto"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground mb-6">Our Mission & Vision</h3>
              <p className="text-muted-foreground mb-6">
                BMPA has been at the forefront of the printing industry, advocating for professional standards, 
                facilitating business growth, and fostering innovation across the printing ecosystem.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <Shield className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Industry Leadership</h4>
                    <p className="text-sm text-muted-foreground">Representing 2,500+ printing professionals across India</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <GraduationCap className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Professional Development</h4>
                    <p className="text-sm text-muted-foreground">Training programs, workshops, and industry certifications</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mt-1">
                    <Handshake className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">Business Advocacy</h4>
                    <p className="text-sm text-muted-foreground">Policy advocacy and industry representation at government levels</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Initiatives */}
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChartLine className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Pridex & Cardex</h3>
                <p className="text-sm text-muted-foreground">
                  Industry indices in partnership with CRISIL for cost fluctuation tracking in commercial and packaging printing segments
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-chart-2/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="h-8 w-8 text-chart-2" />
                </div>
                <h3 className="text-lg font-semibold mb-3">MLDP Program</h3>
                <p className="text-sm text-muted-foreground">
                  Members Loyalty Discount Program providing exclusive business discounts and benefits to BMPA members
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-chart-1/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-8 w-8 text-chart-1" />
                </div>
                <h3 className="text-lg font-semibold mb-3">Industry Events</h3>
                <p className="text-sm text-muted-foreground">
                  Printer Summit, Vision Conclave, and professional leagues fostering industry networking and growth
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Printing Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of printing professionals already trading on BMPA Stock Exchange
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild data-testid="register-button">
              <Link href="/register">
                <Users className="mr-2 h-5 w-5" />
                Register Now
              </Link>
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/api/login'} data-testid="login-button">
              <Printer className="mr-2 h-5 w-5" />
              Member Login
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <Printer className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Stock Laabh</h3>
                  <p className="text-gray-300 text-sm">Professional Trading Platform</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                Professional trading platform facilitating efficient trading in materials and equipment for business members.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
                <li><Link href="/register" className="hover:text-white transition-colors">Membership</Link></li>
                <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Stock Trading</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Equipment Sales</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Bulk Orders</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Member Directory</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Price Analytics</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Mumbai, Maharashtra, India</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>+91-22-xxxx-xxxx</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>info@stocklaabh.com</span>
                </div>
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-4 w-4 text-primary" />
                  <span>Mon-Fri: 9 AM - 6 PM</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-700 my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-300 text-sm">
              © 2025 Stock Laabh. All rights reserved.
            </p>
            <p className="text-gray-300 text-sm">
              Designed by Renuka Print ERP Solutions
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
