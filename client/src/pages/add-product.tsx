import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, X, Package, DollarSign, Hash, MapPin, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { ObjectUploader } from "@/components/ObjectUploader";

const productSchema = z.object({
  title: z.string().min(1, "Product title is required").max(200, "Title must be under 200 characters"),
  description: z.string().optional(),
  category_id: z.string().min(1, "Category is required"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unit: z.string().min(1, "Unit is required"),
  min_order_quantity: z.number().int().min(1, "Minimum order quantity must be at least 1").optional(),
  location: z.string().optional(),
  expiry_date: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function AddProduct() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      price: 0,
      quantity: 1,
      unit: "",
      min_order_quantity: 1,
      location: "",
      expiry_date: "",
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return apiRequest("POST", "/api/categories", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Category created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowAddCategory(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData & { image_urls: string[] }) => {
      return apiRequest("POST", "/api/products", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product added successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock/listings"] });
      form.reset();
      setUploadedImages([]);
      
      // Ask user if they want to add another product
      const addAnother = window.confirm("Product added successfully! Would you like to add another product?");
      if (!addAnother) {
        setLocation("/marketplace");
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate({
      ...data,
      image_urls: uploadedImages,
    });
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload");
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: any) => {
    console.log('Upload result:', result);
    if (result.successful && result.successful.length > 0) {
      const uploadedUrls = result.successful.map((file: any) => file.uploadURL);
      console.log('Uploaded URLs:', uploadedUrls);
      
      // Process uploaded images through the backend to get proper object paths
      const processedImages = [];
      for (const url of uploadedUrls) {
        try {
          const response = await apiRequest("PUT", "/api/product-images", {
            imageURL: url,
          });
          console.log('Backend response:', response);
          processedImages.push(response.objectPath || url);
        } catch (error) {
          console.error("Error processing image URL:", error);
          processedImages.push(url); // Fallback to original URL
        }
      }
      
      console.log('Processed images:', processedImages);
      setUploadedImages([...uploadedImages, ...processedImages]);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Add New Product</h1>
          <p className="text-muted-foreground">List your product for other members to discover and purchase</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Product Information</span>
            </CardTitle>
            <CardDescription>
              Fill in the details below to list your product on the marketplace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Product Title *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter product title" 
                            {...field}
                            data-testid="input-product-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category *</FormLabel>
                        <div className="flex gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category: any) => (
                                <SelectItem key={category.category_id} value={category.category_id.toString()}>
                                  {category.category_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
                            <DialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                data-testid="add-category-button"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add New Category</DialogTitle>
                                <DialogDescription>
                                  Create a new product category for the marketplace
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Category Name *</label>
                                  <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Enter category name"
                                    data-testid="input-new-category-name"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Description</label>
                                  <Textarea
                                    value={newCategoryDescription}
                                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                                    placeholder="Enter category description"
                                    data-testid="textarea-new-category-description"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAddCategory(false)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      if (newCategoryName.trim()) {
                                        createCategoryMutation.mutate({
                                          name: newCategoryName.trim(),
                                          description: newCategoryDescription.trim() || undefined,
                                        });
                                      }
                                    }}
                                    disabled={!newCategoryName.trim() || createCategoryMutation.isPending}
                                    data-testid="button-create-category"
                                  >
                                    {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4" />
                          <span>Price (₹) *</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="0.00" 
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <Hash className="h-4 w-4" />
                          <span>Quantity *</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Unit */}
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="kg, pieces, meters, etc." 
                            {...field}
                            data-testid="input-unit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Minimum Order Quantity */}
                  <FormField
                    control={form.control}
                    name="min_order_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Quantity</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="1" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-min-order"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>Location</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="City, State" 
                            {...field}
                            data-testid="input-location"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expiry Date */}
                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiry Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field}
                            data-testid="input-expiry-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe your product in detail..."
                            className="min-h-[100px]"
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Product Images</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload high-quality images of your product to attract more buyers
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                    <ObjectUploader
                      maxNumberOfFiles={5}
                      maxFileSize={10485760} // 10MB
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonClassName="w-full"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm font-medium">Upload Product Images</span>
                        <span className="text-xs text-muted-foreground">
                          Max 5 images, up to 10MB each
                        </span>
                      </div>
                    </ObjectUploader>
                  </div>

                  {/* Uploaded Images */}
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      {uploadedImages.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url.startsWith('/objects/') ? `${window.location.origin}${url}` : url}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border"
                            onError={(e) => {
                              // Log the failed URL for debugging
                              console.log('Failed to load image:', url);
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NzI4NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlPC90ZXh0Pjwvc3ZnPg==';
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    data-testid="button-submit"
                    className="min-w-[120px]"
                  >
                    {createProductMutation.isPending ? "Adding..." : "Add Product"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}