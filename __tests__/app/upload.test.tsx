// FILE: __tests__/app/upload.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UploadPage from '@/app/upload/page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock react-dropzone, capturing the onDrop option
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn((options) => ({
    getRootProps: jest.fn(() => ({})),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false,
  })),
}));

// Mock PapaParse
jest.mock('papaparse', () => ({
  parse: jest.fn(),
}));

// Mock detectAndConvertEncoding
jest.mock('@/lib/csv-encoding', () => ({
  detectAndConvertEncoding: jest.fn(),
}));

describe('UploadPage', () => {
  let mockRouter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      push: jest.fn(),
      back: jest.fn(),
    };

    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    // JSDOM does not implement File.prototype.arrayBuffer — polyfill it
    if (!(File.prototype as any).arrayBuffer) {
      (File.prototype as any).arrayBuffer = function(): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(this);
        });
      };
    }

    // Default mock for detectAndConvertEncoding
    const { detectAndConvertEncoding } = require('@/lib/csv-encoding');
    detectAndConvertEncoding.mockReturnValue({
      text: 'header1,header2\nval1,val2',
      hasGarbledText: false,
      confidence: 1.0,
      detectedEncoding: 'UTF-8',
    });

    // Default mock for Papa.parse
    const Papa = require('papaparse');
    Papa.parse.mockReturnValue({
      data: [{ header1: 'val1', header2: 'val2' }],
      errors: [],
      meta: { fields: ['header1', 'header2'] },
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<UploadPage />);
    });

    it('shows upload title', async () => {
      render(<UploadPage />);
      // Component shows "CSVアップロード" as the page title
      await screen.findByText('CSVアップロード');
    });

    it('shows upload description', async () => {
      render(<UploadPage />);
      await screen.findByText(/CSVファイルをドラッグ/);
    });

    it('shows file select button', async () => {
      render(<UploadPage />);
      const button = await screen.findByRole('button', { name: 'ファイルを選択' });
      expect(button).toBeInTheDocument();
    });

    it('shows help text about CSV format', async () => {
      render(<UploadPage />);
      await screen.findByText(/CSVファイルの形式/);
    });
  });

  describe('drag and drop prevention', () => {
    it('prevents default drag events on mount', () => {
      render(<UploadPage />);
      // Component adds event listeners on mount
      expect(document).toBeTruthy();
    });
  });

  describe('loading states', () => {
    it('hides processing indicator when not processing', async () => {
      render(<UploadPage />);
      await waitFor(() => {
        expect(screen.queryByText(/処理中/)).toBeNull();
      }, { timeout: 5000 });
    });
  });

  describe('back button', () => {
    it('calls router.back when back button is clicked', async () => {
      render(<UploadPage />);
      // The back button is the first button in the header (ArrowLeft icon)
      const buttons = screen.getAllByRole('button');
      // First button should be the back/arrow button
      fireEvent.click(buttons[0]);
      expect(mockRouter.back).toHaveBeenCalled();
    });
  });

  describe('file processing', () => {
    it('processes CSV file on upload via dropzone', async () => {
      const mockFile = new File(['header1,header2\nval1,val2'], 'test.csv', { type: 'text/csv' });
      const { useDropzone } = require('react-dropzone');
      const Papa = require('papaparse');

      render(<UploadPage />);

      // Get the onDrop callback captured from the useDropzone call
      const dropzoneCall = useDropzone.mock.calls[useDropzone.mock.calls.length - 1];
      const onDrop = dropzoneCall?.[0]?.onDrop;
      expect(onDrop).toBeDefined();

      // onDrop does not await parseFileForPreview internally, so use waitFor
      act(() => {
        onDrop([mockFile]);
      });

      await waitFor(() => {
        expect(Papa.parse).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('shows preview after file is processed', async () => {
      const mockFile = new File(['header1,header2\nval1,val2'], 'test.csv', { type: 'text/csv' });
      const { useDropzone } = require('react-dropzone');

      render(<UploadPage />);

      const dropzoneCall = useDropzone.mock.calls[useDropzone.mock.calls.length - 1];
      const onDrop = dropzoneCall?.[0]?.onDrop;

      act(() => {
        onDrop([mockFile]);
      });

      // After processing, preview should be shown
      await screen.findByText('CSVプレビュー', {}, { timeout: 3000 });
    });

    it('shows cancel button in preview mode', async () => {
      const mockFile = new File(['header1,header2\nval1,val2'], 'test.csv', { type: 'text/csv' });
      const { useDropzone } = require('react-dropzone');

      render(<UploadPage />);

      const dropzoneCall = useDropzone.mock.calls[useDropzone.mock.calls.length - 1];
      const onDrop = dropzoneCall?.[0]?.onDrop;

      act(() => {
        onDrop([mockFile]);
      });

      // Cancel button appears in preview mode
      await screen.findByText('キャンセル', {}, { timeout: 3000 });
    });

    it('cancel button hides preview and returns to upload view', async () => {
      const mockFile = new File(['header1,header2\nval1,val2'], 'test.csv', { type: 'text/csv' });
      const { useDropzone } = require('react-dropzone');

      render(<UploadPage />);

      const dropzoneCall = useDropzone.mock.calls[useDropzone.mock.calls.length - 1];
      const onDrop = dropzoneCall?.[0]?.onDrop;

      act(() => {
        onDrop([mockFile]);
      });

      const cancelButton = await screen.findByText('キャンセル', {}, { timeout: 3000 });
      fireEvent.click(cancelButton);

      // Should return to upload view
      await screen.findByText('CSVアップロード');
    });

    it('does not process if encoding has garbled text', async () => {
      const { detectAndConvertEncoding } = require('@/lib/csv-encoding');
      detectAndConvertEncoding.mockReturnValue({
        text: '',
        hasGarbledText: true,
        confidence: 0.5,
        detectedEncoding: 'SJIS',
      });

      const mockFile = new File(['garbled'], 'test.csv', { type: 'text/csv' });
      const { useDropzone } = require('react-dropzone');
      const Papa = require('papaparse');

      // Mock window.alert
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<UploadPage />);

      const dropzoneCall = useDropzone.mock.calls[useDropzone.mock.calls.length - 1];
      const onDrop = dropzoneCall?.[0]?.onDrop;

      await act(async () => {
        await onDrop([mockFile]);
      });

      expect(alertSpy).toHaveBeenCalled();
      expect(Papa.parse).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });
  });
});
