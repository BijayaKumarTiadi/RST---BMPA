import Navigation from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Building, Users, Target, Award, Handshake, Lightbulb } from "lucide-react";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="about-heading">
            About Stock Laabh
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            A comprehensive B2B ecommerce marketplace for the trading industry, connecting print providers, 
            suppliers, and allied businesses in a unified platform.
          </p>
        </div>

        {/* About Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Who We Are</h2>
            <p className="text-muted-foreground mb-4">
              Stock Laabh is a well-networked association of print providers, pre-press, pre-media specialists, 
              post-press and converting, package printing, agencies; and printers' suppliers including manufacturers and traders.
            </p>
            <p className="text-muted-foreground mb-4">
              In this age of cross-technology solutions and a communication cycle that is ultra dynamic; one that is 
              continuously pushing the limits and reinventing the means; Stock Laabh acknowledges the growing 
              inter-dependence amongst printing technologies and allied media and communication processes.
            </p>
            <p className="text-muted-foreground">
              We realize that to nurture, grow and promote this industry, it becomes essential to understand the 
              importance of togetherness as opposed to isolation and importance of cohesiveness as opposed to fragmentation. 
              Stock Laabh is a body that promotes, protects and unites the printing industry. It functions as a common 
              force that updates and disseminates info and know-how to facilitate industry growth.
            </p>
          </CardContent>
        </Card>

        {/* Mission and Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="mr-2 h-6 w-6 text-primary" />
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Our mission is to guide, educate, and support print professionals toward growth and 
                successful service to their institutions, creating a unified platform for industry excellence.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="mr-2 h-6 w-6 text-primary" />
                Our Vision
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                To be a pre-eminent organization in developing cooperation amongst print industry 
                stakeholders and provide state-of-art technology, education, and business solutions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Key Values */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Our Key Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <Users className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Develop Business Leaders</h3>
                  <p className="text-sm text-muted-foreground">
                    Foster technocrats and entrepreneurs in the printing industry
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Award className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Recognize Excellence</h3>
                  <p className="text-sm text-muted-foreground">
                    Encourage and celebrate outstanding achievements in printing
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Building className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Improve Quality of Life</h3>
                  <p className="text-sm text-muted-foreground">
                    Committed to enhancing life for the print community
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Handshake className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Foster Cooperation</h3>
                  <p className="text-sm text-muted-foreground">
                    Build partnerships among all industry stakeholders
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Technology Education</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide cutting-edge print technology knowledge
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Target className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Industry Growth</h3>
                  <p className="text-sm text-muted-foreground">
                    Drive sustainable development across the sector
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Our Roots */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Heritage</h2>
            <p className="text-muted-foreground mb-4">
              The success of every community or association lies in its strong roots. While our platform came into 
              being recently, its conception goes back to the foundations laid by industry pioneers who had the 
              greater common good of the industry in their hearts and the willingness to make a difference.
            </p>
            <p className="text-muted-foreground mb-4">
              Their vision was to conceive a platform which the entire industry could turn to for guidance and assistance. 
              This vision and willingness gave way to a comprehensive trading platform that serves the printing and 
              allied industries.
            </p>
            <p className="text-muted-foreground">
              From this foundation, we have grown to serve hundreds of businesses, connecting buyers and sellers 
              in a professional trading environment that promotes industry growth and collaboration.
            </p>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <Card>
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">Join Our Community</h2>
              <p className="text-muted-foreground mb-6">
                Become part of our growing network of print industry professionals. 
                Access exclusive trading opportunities and grow your business with us.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/register">Join Now - ₹2,499/year</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/marketplace">Browse Marketplace</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          Powered by Renuka Print ERP Solutions
        </div>
      </div>
    </div>
  );
}