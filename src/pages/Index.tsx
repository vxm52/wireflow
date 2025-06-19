import React, { useState, useCallback } from 'react';
import { Upload, Code, Sun, Moon, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useToast } from '@/hooks/use-toast';
import { generateCode, base64ToBlob, ApiError } from '@/lib/api';

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setGeneratedCode(''); // Clear previous code when new image is uploaded
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const generateCodeHandler = async () => {
    if (!uploadedImage) {
      toast({
        title: "No image uploaded",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Convert base64 to blob for API call
      const base64Data = uploadedImage.split(',')[1];
      const imageFile = await base64ToBlob(base64Data, 'wireframe.png');

      const response = await generateCode(imageFile);
      setGeneratedCode(response.code);

      toast({
        title: "Code generated successfully!",
        description: "Your wireframe has been converted to code.",
      });
    } catch (error) {
      console.error('Error generating code:', error);

      let errorMessage = "Please try again or check if the backend is running.";
      if (error instanceof ApiError) {
        if (error.status === 404) {
          errorMessage = "Backend service not found. Please ensure the FastAPI server is running.";
        } else if (error.status === 500) {
          errorMessage = "Server error occurred. Please try again later.";
        }
      }

      toast({
        title: "Error generating code",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
    }`}>
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Code className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Wireflow
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className={`rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-white/50'}`}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600" />
          )}
        </Button>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Wireflow – Turn Designs Into Code
          </h1>
          <p className={`text-xl md:text-2xl mb-8 max-w-3xl mx-auto ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload your wireframes and UI screenshots to generate clean, responsive code instantly
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/70 backdrop-blur-sm border-gray-200'}`}>
              <CardContent className="p-6">
                <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Upload Your Design
                </h2>

                {/* Dropzone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`
                    relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer
                    ${isDragOver 
                      ? (isDarkMode ? 'border-blue-400 bg-blue-900/20' : 'border-blue-500 bg-blue-50') 
                      : (isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')
                    }
                    ${isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}
                  `}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />

                  <Upload className={`w-12 h-12 mx-auto mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <p className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Drop your wireframe here
                  </p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    or click to browse files • PNG, JPG, SVG up to 10MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Image Preview */}
            {uploadedImage && (
              <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/70 backdrop-blur-sm border-gray-200'}`}>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <ImageIcon className={`w-5 h-5 mr-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Preview
                    </h3>
                  </div>
                  <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <img
                      src={uploadedImage}
                      alt="Uploaded wireframe"
                      className="w-full h-auto max-h-96 object-contain bg-white"
                    />
                  </div>

                  <Button
                    onClick={generateCodeHandler}
                    disabled={isGenerating}
                    className="w-full mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Code className="w-5 h-5 mr-2" />
                        Generate Code
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Code Output Section */}
          <div>
            <Card className={`h-full ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/70 backdrop-blur-sm border-gray-200'}`}>
              <CardContent className="p-6 h-full flex flex-col">
                <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Generated Code
                </h2>

                {generatedCode ? (
                  <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <SyntaxHighlighter
                      language="jsx"
                      style={isDarkMode ? oneDark : oneLight}
                      customStyle={{
                        margin: 0,
                        height: '100%',
                        minHeight: '400px',
                      }}
                      showLineNumbers
                    >
                      {generatedCode}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <div className={`flex-1 flex items-center justify-center rounded-lg border-2 border-dashed ${isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-gray-50'}`}>
                    <div className="text-center">
                      <Code className={`w-16 h-16 mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {isGenerating ? 'Generating code...' : 'Upload a design to generate code'}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
