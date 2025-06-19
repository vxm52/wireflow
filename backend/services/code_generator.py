import os
from typing import Dict, Any
import openai
from openai import OpenAI

class CodeGenerator:
    """
    Service for generating React/JSX code from layout data using OpenAI.
    """
    
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4"  # or "gpt-3.5-turbo" for faster/cheaper responses
    
    async def generate_code(self, layout_data: Dict[str, Any]) -> str:
        """
        Generate React/JSX code from layout data using OpenAI.
        
        Args:
            layout_data: Dictionary containing detected layout information
            
        Returns:
            Generated React/JSX code as string
        """
        try:
            # Create prompt for OpenAI
            prompt = self._create_prompt(layout_data)
            
            # Call OpenAI API
            response = await self._call_openai(prompt)
            
            # Extract and clean the generated code
            generated_code = self._extract_code_from_response(response)
            
            return generated_code
            
        except Exception as e:
            # Fallback to mock code if OpenAI fails
            print(f"Error calling OpenAI: {str(e)}")
            return self._generate_fallback_code(layout_data)
    
    def _create_prompt(self, layout_data: Dict[str, Any]) -> str:
        """
        Create a detailed prompt for OpenAI based on layout data.
        """
        elements = layout_data.get("detected_elements", [])
        layout_structure = layout_data.get("layout_structure", {})
        container = layout_data.get("container", {})
        
        prompt = f"""
You are an expert React developer. Generate clean, modern React/JSX code based on the following wireframe layout data.

Layout Structure:
- Type: {layout_structure.get('type', 'flex')}
- Columns: {layout_structure.get('columns', 1)}
- Gap: {layout_structure.get('gap', 'gap-4')}
- Responsive: {layout_structure.get('responsive', False)}

Container:
- Max Width: {container.get('max_width', 'max-w-6xl')}
- Padding: {container.get('padding', 'p-6')}
- Margin: {container.get('margin', 'mx-auto')}

Detected Elements:
"""
        
        for element in elements:
            element_type = element.get("type", "div")
            content = element.get("content", "")
            style = element.get("style", {})
            
            prompt += f"""
- Type: {element_type}
- Content: {content}
- Style: {style}
"""
        
        prompt += """
Requirements:
1. Use Tailwind CSS classes for styling
2. Make the component responsive
3. Use semantic HTML elements
4. Include proper accessibility attributes
5. Use modern React patterns
6. Generate only the JSX/TSX code, no imports or component wrapper
7. Use className instead of class
8. Make sure the code is production-ready and follows best practices

Generate the React/JSX code:
"""
        
        return prompt
    
    async def _call_openai(self, prompt: str) -> str:
        """
        Call OpenAI API with the given prompt.
        """
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert React developer who generates clean, modern, and responsive React/JSX code using Tailwind CSS. Always respond with only the JSX code, no explanations or markdown formatting."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.3,
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    def _extract_code_from_response(self, response: str) -> str:
        """
        Extract clean code from OpenAI response.
        """
        # Remove markdown code blocks if present
        if "```jsx" in response:
            start = response.find("```jsx") + 6
            end = response.find("```", start)
            return response[start:end].strip()
        elif "```tsx" in response:
            start = response.find("```tsx") + 6
            end = response.find("```", start)
            return response[start:end].strip()
        elif "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            return response[start:end].strip()
        
        return response.strip()
    
    def _generate_fallback_code(self, layout_data: Dict[str, Any]) -> str:
        """
        Generate fallback code when OpenAI is not available.
        """
        elements = layout_data.get("detected_elements", [])
        layout_structure = layout_data.get("layout_structure", {})
        container = layout_data.get("container", {})
        
        # Generate basic JSX based on detected elements
        jsx_parts = []
        
        # Container
        container_classes = f"{container.get('max_width', 'max-w-6xl')} {container.get('padding', 'p-6')} {container.get('margin', 'mx-auto')}"
        
        # Layout structure
        if layout_structure.get("type") == "grid":
            grid_classes = f"grid grid-cols-1 md:grid-cols-{layout_structure.get('columns', 2)} {layout_structure.get('gap', 'gap-6')}"
            jsx_parts.append(f'<div className="{container_classes}">')
            jsx_parts.append(f'  <div className="{grid_classes}">')
        else:
            jsx_parts.append(f'<div className="{container_classes}">')
            jsx_parts.append('  <div className="space-y-6">')
        
        # Generate elements
        for element in elements:
            element_type = element.get("type", "div")
            content = element.get("content", "")
            style = element.get("style", {})
            
            # Build className from style
            classes = []
            if style.get("font_size"):
                classes.append(style["font_size"])
            if style.get("font_weight"):
                classes.append(style["font_weight"])
            if style.get("color"):
                classes.append(style["color"])
            if style.get("line_height"):
                classes.append(style["line_height"])
            if style.get("background"):
                classes.append(style["background"])
            if style.get("text_color"):
                classes.append(style["text_color"])
            if style.get("padding"):
                classes.append(style["padding"])
            if style.get("border_radius"):
                classes.append(style["border_radius"])
            if style.get("hover"):
                classes.append(style["hover"])
            
            className = " ".join(classes) if classes else ""
            
            # Generate appropriate JSX
            if element_type == "header":
                jsx_parts.append(f'    <h1 className="{className}">{content}</h1>')
            elif element_type == "paragraph":
                jsx_parts.append(f'    <p className="{className}">{content}</p>')
            elif element_type == "button":
                jsx_parts.append(f'    <button className="{className}">{content}</button>')
            elif element_type == "image_placeholder":
                jsx_parts.append(f'    <div className="{className} flex items-center justify-center">')
                jsx_parts.append('      <div className="text-center">')
                jsx_parts.append('        <div className="w-16 h-16 bg-gray-300 rounded-full mx-auto mb-4"></div>')
                jsx_parts.append(f'        <p className="text-gray-500">{content}</p>')
                jsx_parts.append('      </div>')
                jsx_parts.append('    </div>')
            else:
                jsx_parts.append(f'    <div className="{className}">{content}</div>')
        
        # Close containers
        jsx_parts.append('  </div>')
        jsx_parts.append('</div>')
        
        return "\n".join(jsx_parts) 