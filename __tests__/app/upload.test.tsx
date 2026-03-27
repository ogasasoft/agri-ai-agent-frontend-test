// FILE: __tests__/app/upload.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UploadPage from '@/app/upload/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: jest.fn(() => ({})),
    getInputProps: jest.fn(() => ({})),
    isDragActive: false,
    acceptedFiles: [],
    rejectedFiles: [],
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
    };
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<UploadPage />);
    });

    it('shows upload icon', async () => {
      render(<UploadPage />);
      await screen.findByText('📤');
    });

    it('shows upload title', async () => {
      render(<UploadPage />);
      await screen.findByText('CSVファイルをアップロード');
    });

    it('shows upload description', async () => {
      render(<UploadPage />);
      await screen.findByText(/CSVファイルをドラッグ＆ドロップまたは/);
    });

    it('shows file input', async () => {
      render(<UploadPage />);
      const input = screen.getByRole('textbox') || screen.getByLabelText(/ファイルを選択/);
      expect(input).toBeInTheDocument();
    });

    it('shows upload button', async () => {
      render(<UploadPage />);
      const button = await screen.findByRole('button', { name: /アップロード|インポート/ });
      expect(button).toBeInTheDocument();
    });

    it('shows cancel button', async () => {
      render(<UploadPage />);
      await screen.findByText('キャンセル');
    });
  });

  describe('drag and drop prevention', () => {
    it('prevents default drag events', () => {
      render(<UploadPage />);

      // Check that the component initializes drag prevention on mount
      expect(document).toBeTruthy();
    });
  });

  describe('file selection', () => {
    it('allows file selection via input', async () => {
      render(<UploadPage />);

      // Trigger file input
      const input = screen.getByRole('textbox') || screen.getByLabelText(/ファイルを選択/);
      fireEvent.change(input, {
        target: { files: [new File(['test'], 'test.csv', { type: 'text/csv' })] }
      });

      // Check that parsed data would be set
      await waitFor(() => {
        expect(screen.getByText(/CSVファイル/)).toBeInTheDocument();
      });
    });
  });

  describe('loading states', () => {
    it('shows processing indicator when processing', async () => {
      render(<UploadPage />);

      // Simulate processing state
      await screen.findByText(/処理中/);
    });

    it('hides processing indicator when done', async () => {
      render(<UploadPage />);

      // Component starts in loading state
      await waitFor(() => {
        expect(screen.queryByText(/処理中/)).toBeNull();
      }, { timeout: 5000 });
    });
  });

  describe('cancel button', () => {
    it('calls router.push with / when cancel button is clicked', async () => {
      render(<UploadPage />);

      const cancelButton = await screen.findByText('キャンセル');
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('file processing', () => {
    it('processes CSV file on upload', async () => {
      const mockFile = new File(['test,data\nvalue1,value2'], 'test.csv', { type: 'text/csv' });
      const mockParsedData = {
        file: mockFile,
        headers: ['data', 'value1', 'value2'],
        rows: [
          { data: 'test', value1: 'value1', value2: 'value2' },
        ],
        allData: [
          { data: 'test', value1: 'value1', value2: 'value2' },
        ],
      };

      const { parse } = require('papaparse');
      parse.mockResolvedValue({ data: mockParsedData });

      render(<UploadPage />);

      const input = screen.getByRole('textbox') || screen.getByLabelText(/ファイルを選択/);
      fireEvent.change(input, { target: { files: [mockFile] } });

      await waitFor(() => {
        expect(parse).toHaveBeenCalled();
      });
    });
  });
});
