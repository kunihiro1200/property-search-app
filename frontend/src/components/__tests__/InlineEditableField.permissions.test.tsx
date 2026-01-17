/**
 * Integration tests for InlineEditableField permissions
 * Tests read-only field protection and permission enforcement
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineEditableField } from '../InlineEditableField';

describe('InlineEditableField - Permissions', () => {
  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  describe('Read-only field protection', () => {
    it('should not activate edit mode when clicking on read-only field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      const field = screen.getByText('Test Value');
      await user.click(field);

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      
      // Should not call onSave
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should display lock icon for read-only fields', () => {
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      // Lock icon should be present
      const lockIcon = screen.getByRole('img', { hidden: true });
      expect(lockIcon).toBeInTheDocument();
    });

    it('should show tooltip when clicking on read-only field with reason', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
          permissions={{ canEdit: false, reason: 'システム管理フィールド' }}
        />
      );

      const field = screen.getByText('Test Value');
      await user.click(field);

      // Tooltip should appear (check for the tooltip div specifically)
      await waitFor(() => {
        const tooltips = screen.getAllByText('システム管理フィールド');
        // The tooltip should be in a div with specific classes
        const tooltip = tooltips.find(el => 
          el.className.includes('absolute') && 
          el.className.includes('z-10') &&
          el.className.includes('bg-gray-900')
        );
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('should apply read-only styling', () => {
      const { container } = render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      const displayDiv = container.querySelector('.text-gray-500');
      expect(displayDiv).toBeInTheDocument();
      expect(displayDiv).toHaveClass('bg-gray-50');
      expect(displayDiv).toHaveClass('cursor-not-allowed');
    });

    it('should not show hover effect on read-only fields', async () => {
      const user = userEvent.setup();
      
      const { container } = render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      const field = screen.getByText('Test Value');
      await user.hover(field);

      // Should not have hover styling
      const displayDiv = container.querySelector('.bg-blue-50');
      expect(displayDiv).not.toBeInTheDocument();
    });
  });

  describe('Permission enforcement', () => {
    it('should not activate edit mode when permissions.canEdit is false', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          permissions={{ canEdit: false, reason: '権限がありません' }}
        />
      );

      const field = screen.getByText('Test Value');
      await user.click(field);

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should prevent keyboard activation of read-only fields', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      const field = screen.getByText('Test Value').parentElement;
      if (field) {
        field.focus();
        await user.keyboard('{Enter}');
      }

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should prevent space key activation of read-only fields', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="Test Value"
          fieldName="testField"
          fieldType="text"
          onSave={mockOnSave}
          readOnly={true}
        />
      );

      const field = screen.getByText('Test Value').parentElement;
      if (field) {
        field.focus();
        await user.keyboard(' ');
      }

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('System-managed fields', () => {
    it('should not allow editing of id field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="12345"
          fieldName="id"
          fieldType="text"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText('12345');
      await user.click(field);

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should not allow editing of createdAt field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="2024-01-01"
          fieldName="createdAt"
          fieldType="date"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText(/2024/);
      await user.click(field);

      // Should not show date input
      expect(screen.queryByDisplayValue('2024-01-01')).not.toBeInTheDocument();
    });

    it('should not allow editing of updatedAt field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="2024-01-01"
          fieldName="updatedAt"
          fieldType="date"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText(/2024/);
      await user.click(field);

      // Should not show date input
      expect(screen.queryByDisplayValue('2024-01-01')).not.toBeInTheDocument();
    });

    it('should not allow editing of lastModifiedBy field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="admin@example.com"
          fieldName="lastModifiedBy"
          fieldType="text"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText('admin@example.com');
      await user.click(field);

      // Should not show input field
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });
  });

  describe('Editable fields', () => {
    it('should allow editing of name field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="John Doe"
          fieldName="name"
          fieldType="text"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText('John Doe');
      await user.click(field);

      // Should show input field
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should allow editing of email field', async () => {
      const user = userEvent.setup();
      
      render(
        <InlineEditableField
          value="test@example.com"
          fieldName="email"
          fieldType="email"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText('test@example.com');
      await user.click(field);

      // Should show email input
      const input = screen.getByDisplayValue('test@example.com');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should show hover effect on editable fields', async () => {
      const user = userEvent.setup();
      
      const { container } = render(
        <InlineEditableField
          value="Test Value"
          fieldName="name"
          fieldType="text"
          onSave={mockOnSave}
        />
      );

      const field = screen.getByText('Test Value');
      await user.hover(field);

      // Should have hover styling
      await waitFor(() => {
        const displayDiv = container.querySelector('.bg-blue-50');
        expect(displayDiv).toBeInTheDocument();
      });
    });
  });
});
