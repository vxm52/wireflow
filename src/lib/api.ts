const API_BASE_URL = 'http://localhost:8000';

export interface GenerateCodeResponse {
  code: string;
  message?: string;
}

export interface GenerateCodeRequest {
  image: File;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const generateCode = async (image: File): Promise<GenerateCodeResponse> => {
  const formData = new FormData();
  formData.append('image', image);

  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new ApiError(
      `HTTP error! status: ${response.status}`,
      response.status,
      response
    );
  }

  return response.json();
};

// Utility function to convert base64 to blob
export const base64ToBlob = async (base64Data: string, filename: string = 'image.png'): Promise<File> => {
  const response = await fetch(`data:image/png;base64,${base64Data}`);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}; 