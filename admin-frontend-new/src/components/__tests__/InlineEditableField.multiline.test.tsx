import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditableField } from '../InlineEditableField';
import '@testing-library/jest-dom';

/**
 * Property-Based Test for Multi-line Text Preservation
 * Feature: buyer-detail-inline-edit, Property 3: Multi-line Text Preservation
 * Validates: Requirements 3.5
 * 
 * For any multi-line text field, editing and saving should preserve all line breaks
 * and formatting in the original text.
 */

describe('InlineEditableField - Multi-line Text Preservation (Property 3)', () => {
  // Helper function to generate random multi-line text with various patterns
  const generateMultilineText = (seed: number): string => {
    const patterns = [
      // Single line break
      'Line 1\nLine 2',
      // Multiple line breaks
      'Line 1\n\nLine 2\n\nLine 3',
      // Mixed line breaks
      'Line 1\nLine 2\n\nLine 3\nLine 4',
      // Leading line breaks
      '\nLine 1\nLine 2',
      // Trailing line breaks
      'Line 1\nLine 2\n',
      // Multiple consecutive line breaks
      'Line 1\n\n\nLine 2',
      // Line breaks with spaces
      'Line 1\n \nLine 2',
      // Tabs and line breaks
      'Line 1\n\tLine 2',
      // Empty lines in between
      'Line 1\n\n\n\nLine 2',
      // Complex pattern
      'First paragraph\n\nSecond paragraph with\nmultiple lines\n\nThird paragraph',
      // Leading and trailing whitespace
      '  Line 1  \n  Line 2  ',
      // Mixed whitespace
      'Line 1\n  \nLine 2\n\t\nLine 3',
    ];
    
    return patterns[seed % patterns.length];
  };

  // Helper function to generate random whitespace patterns
  const generateWhitespaceText = (seed: number): string => {
    const patterns = [
      // Leading spaces
      '   Text with leading spaces',
      // Trailing spaces
      'Text with trailing spaces   ',
      // Multiple spaces
      'Text  with   multiple    spaces',
      // Tabs
      'Text\twith\ttabs',
      // Mixed whitespace
      '  Text  with\tmixed   whitespace  ',
      // Only whitespace
      '   \t   ',
      // Whitespace between words
      'Word1     Word2',
    ];
    
    return patterns[seed % patterns.length];
  };

  it('should preserve line breaks when editing and saving (100 iterations)', async () => {
    const iterations = 100;
    const results: Array<{ seed: number; success: boolean; error?: string }> = [];

    for (let i = 0; i < iterations; i++) {
      const originalText = generateMultilineText(i);
      let savedValue: string | null = null;

      const handleSave = jest.fn(async (value: string) => {
        savedValue = value;
      });

      const { unmount } = render(
        <InlineEditableField
          value={originalText}
          fieldName="test_field"
          fieldType="textarea"
          onSave={handleSave}
          multiline={true}
        />
      );

      try {
        // Click to activate edit mode
        const displayElement = screen.getByRole('button', { name: /test_fieldを編集/i });
        fireEvent.click(displayElement);

        // Wait for edit mode to activate
        await waitFor(() => {
          expect(screen.queryByRole('textbox')).toBeInTheDocument();
        });

        // Get the textarea
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        
        // Verify the textarea contains the original text with line breaks
        expect(textarea.value).toBe(originalText);

        // Blur to trigger save (without editing to preserve original value)
        fireEvent.blur(textarea);

        // Wait for save to complete
        await waitFor(() => {
          expect(handleSave).toHaveBeenCalled();
        }, { timeout: 1000 });

        // Verify the saved value preserves line breaks
        expect(savedValue).toBe(originalText);

        results.push({ seed: i, success: true });
      } catch (error) {
        results.push({
          seed: i,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        unmount();
      }
    }

    // Check results
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.error('Failed iterations:', failures);
    }

    expect(failures.length).toBe(0);
  }, 30000); // 30 second timeout for 100 iterations

  it('should preserve whitespace when editing and saving (100 iterations)', async () => {
    const iterations = 100;
    const results: Array<{ seed: number; success: boolean; error?: string }> = [];

    for (let i = 0; i < iterations; i++) {
      const originalText = generateWhitespaceText(i);
      let savedValue: string | null = null;

      const handleSave = jest.fn(async (value: string) => {
        savedValue = value;
      });

      const { unmount } = render(
        <InlineEditableField
          value={originalText}
          fieldName="test_field"
          fieldType="textarea"
          onSave={handleSave}
          multiline={true}
        />
      );

      try {
        // Click to activate edit mode
        const displayElement = screen.getByRole('button', { name: /test_fieldを編集/i });
        fireEvent.click(displayElement);

        // Wait for edit mode to activate
        await waitFor(() => {
          expect(screen.queryByRole('textbox')).toBeInTheDocument();
        });

        // Get the textarea
        const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
        
        // Verify the textarea contains the original text with whitespace
        expect(textarea.value).toBe(originalText);

        // Blur to trigger save (without editing)
        fireEvent.blur(textarea);

        // Wait for save to complete
        await waitFor(() => {
          expect(handleSave).toHaveBeenCalled();
        }, { timeout: 1000 });

        // Verify the saved value preserves whitespace
        expect(savedValue).toBe(originalText);

        results.push({ seed: i, success: true });
      } catch (error) {
        results.push({
          seed: i,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        unmount();
      }
    }

    // Check results
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      console.error('Failed iterations:', failures);
    }

    expect(failures.length).toBe(0);
  }, 30000); // 30 second timeout for 100 iterations

  it('should display multi-line text with preserved line breaks in display mode', async () => {
    const testCases = [
      'Line 1\nLine 2',
      'Line 1\n\nLine 2',
      'First\nSecond\nThird',
      '\nLeading line break',
      'Trailing line break\n',
    ];

    for (const text of testCases) {
      const { unmount, container } = render(
        <InlineEditableField
          value={text}
          fieldName="test_field"
          fieldType="textarea"
          onSave={jest.fn()}
          multiline={true}
        />
      );

      // Find the pre element that displays the text
      const preElement = container.querySelector('pre');
      
      // Verify pre element exists
      expect(preElement).toBeInTheDocument();
      
      // Verify it has the correct classes
      expect(preElement).toHaveClass('whitespace-pre-wrap');
      
      // Verify the text content matches (including line breaks)
      expect(preElement?.textContent).toBe(text);

      unmount();
    }
  });

  it('should handle empty lines correctly', async () => {
    const textWithEmptyLines = 'Line 1\n\n\nLine 2';
    let savedValue: string | null = null;

    const handleSave = jest.fn(async (value: string) => {
      savedValue = value;
    });

    render(
      <InlineEditableField
        value={textWithEmptyLines}
        fieldName="test_field"
        fieldType="textarea"
        onSave={handleSave}
        multiline={true}
      />
    );

    // Click to activate edit mode
    const displayElement = screen.getByRole('button', { name: /test_fieldを編集/i });
    fireEvent.click(displayElement);

    // Wait for edit mode to activate
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).toBeInTheDocument();
    });

    // Get the textarea
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Verify empty lines are preserved
    expect(textarea.value).toBe(textWithEmptyLines);

    // Blur to trigger save
    fireEvent.blur(textarea);

    // Wait for save to complete
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalled();
    });

    // Verify empty lines are preserved in saved value
    expect(savedValue).toBe(textWithEmptyLines);
  });

  it('should handle text with only whitespace', async () => {
    const whitespaceOnly = '   \n\t\n   ';
    let savedValue: string | null = null;

    const handleSave = jest.fn(async (value: string) => {
      savedValue = value;
    });

    render(
      <InlineEditableField
        value={whitespaceOnly}
        fieldName="test_field"
        fieldType="textarea"
        onSave={handleSave}
        multiline={true}
      />
    );

    // Click to activate edit mode
    const displayElement = screen.getByRole('button', { name: /test_fieldを編集/i });
    fireEvent.click(displayElement);

    // Wait for edit mode to activate
    await waitFor(() => {
      expect(screen.queryByRole('textbox')).toBeInTheDocument();
    });

    // Get the textarea
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Verify whitespace is preserved
    expect(textarea.value).toBe(whitespaceOnly);

    // Blur to trigger save
    fireEvent.blur(textarea);

    // Wait for save to complete
    await waitFor(() => {
      expect(handleSave).toHaveBeenCalled();
    });

    // Verify whitespace is preserved in saved value
    expect(savedValue).toBe(whitespaceOnly);
  });
});
