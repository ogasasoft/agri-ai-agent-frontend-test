// FILE: __tests__/app/change-password.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChangePasswordPage from '@/app/change-password/page';
import { useRouter, useSearchParams } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  redirect: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('ChangePasswordPage', () => {
  let mockRouter: any;
  let mockSearchParams: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    };

    mockSearchParams = {
      get: jest.fn().mockReturnValue(null),
    };

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        user: { id: 1, username: 'testuser', email: 'test@example.com' },
      }),
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<ChangePasswordPage />);
    });

    it('shows change password heading', async () => {
      render(<ChangePasswordPage />);
      await screen.findByText('パスワード変更');
    });

    it('shows current password input field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      expect(input).toBeInTheDocument();
    });

    it('shows new password input field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      expect(input).toBeInTheDocument();
    });

    it('shows confirm password input field', async () => {
      render(<ChangePasswordPage />);
      // Label is "新しいパスワード（確認）"
      const input = await screen.findByLabelText(/新しいパスワード（確認）/);
      expect(input).toBeInTheDocument();
    });

    it('shows change password button', async () => {
      render(<ChangePasswordPage />);
      // Button text is "パスワードを変更"
      const button = await screen.findByRole('button', { name: 'パスワードを変更' });
      expect(button).toBeInTheDocument();
    });

    it('shows logout button when not forced', async () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<ChangePasswordPage />);
      await screen.findByText('ログアウト');
    });

    it('shows back button when not forced', async () => {
      mockSearchParams.get.mockReturnValue(null);
      render(<ChangePasswordPage />);
      await screen.findByText('戻る');
    });

    it('shows security notice when forced', async () => {
      mockSearchParams.get.mockReturnValue('true');
      render(<ChangePasswordPage />);
      await screen.findByText(/セキュリティのため、パスワードの変更が必要です/);
    });

    it('hides navigation when forced', async () => {
      mockSearchParams.get.mockReturnValue('true');
      render(<ChangePasswordPage />);
      // ログアウトボタンは非表示
      await waitFor(() => {
        expect(screen.queryByText('ログアウト')).toBeNull();
      });
    });
  });

  describe('form interactions', () => {
    it('allows typing in current password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      fireEvent.change(input, { target: { value: 'current123' } });
      expect(input).toHaveValue('current123');
    });

    it('allows typing in new password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      fireEvent.change(input, { target: { value: 'newpass123' } });
      expect(input).toHaveValue('newpass123');
    });

    it('allows typing in confirm password field', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText(/新しいパスワード（確認）/);
      fireEvent.change(input, { target: { value: 'newpass123' } });
      expect(input).toHaveValue('newpass123');
    });
  });

  describe('password visibility toggle', () => {
    it('toggles current password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('現在のパスワード');
      expect(input).toHaveAttribute('type', 'password');

      // Toggle button is inside the relative container of the input
      const toggleButton = input.parentElement?.querySelector('button[type="button"]');
      expect(toggleButton).not.toBeNull();

      fireEvent.click(toggleButton!);
      expect(input).toHaveAttribute('type', 'text');

      fireEvent.click(toggleButton!);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('toggles new password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText('新しいパスワード');
      expect(input).toHaveAttribute('type', 'password');

      const toggleButton = input.parentElement?.querySelector('button[type="button"]');
      expect(toggleButton).not.toBeNull();

      fireEvent.click(toggleButton!);
      expect(input).toHaveAttribute('type', 'text');
    });

    it('toggles confirm password visibility', async () => {
      render(<ChangePasswordPage />);
      const input = await screen.findByLabelText(/新しいパスワード（確認）/);
      expect(input).toHaveAttribute('type', 'password');

      const toggleButton = input.parentElement?.querySelector('button[type="button"]');
      expect(toggleButton).not.toBeNull();

      fireEvent.click(toggleButton!);
      expect(input).toHaveAttribute('type', 'text');
    });
  });

  describe('form validation', () => {
    it('shows error when passwords do not match', async () => {
      render(<ChangePasswordPage />);

      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'different123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Error: "新しいパスワードと確認パスワードが一致しません。"
      await screen.findByText(/パスワードが一致しません/);
    });

    it('shows error when new password is too short', async () => {
      render(<ChangePasswordPage />);

      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      await act(async () => {
        fireEvent.change(currentInput, { target: { value: 'current123' } });
        fireEvent.change(newInput, { target: { value: 'short' } });
        fireEvent.change(confirmInput, { target: { value: 'short' } });
      });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Error: "新しいパスワードは8文字以上である必要があります。" (more specific regex to avoid matching req list)
      await screen.findByText(/新しいパスワードは8文字以上/);
    });

    it('shows error when current password is empty', async () => {
      render(<ChangePasswordPage />);

      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      await act(async () => {
        fireEvent.change(newInput, { target: { value: 'newpass123' } });
        fireEvent.change(confirmInput, { target: { value: 'newpass123' } });
      });

      await act(async () => {
        const form = submitBtn.closest('form')!;
        fireEvent.submit(form);

        // Error: "現在のパスワードを入力してください。"
        await screen.findByText(/現在のパスワードを入力してください/);
      });
    });
  });

  describe('form submission – success', () => {
    it('calls fetch with change password endpoint on form submit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/auth/change-password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        }),
      );
    });

    it('shows success message after successful password change', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      // Component sets success: "パスワードを変更しました。"
      await screen.findByText(/パスワードを変更しました/);
    });
  });

  describe('form submission – error', () => {
    it('shows error message when password change fails', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, message: '現在のパスワードが正しくありません。' }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);
      const submitBtn = await screen.findByRole('button', { name: 'パスワードを変更' });

      fireEvent.change(currentInput, { target: { value: 'wrong' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.click(submitBtn);
      });

      await screen.findByText('現在のパスワードが正しくありません。');
    });

    it('shows error heading when error occurs', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ success: false, message: 'エラー発生' }),
        });

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);

      fireEvent.change(currentInput, { target: { value: 'user' } });
      fireEvent.change(newInput, { target: { value: 'pass12345' } });
      fireEvent.change(confirmInput, { target: { value: 'pass12345' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'パスワードを変更' }).closest('form')!);
      });

      // Error heading is "エラー"
      await screen.findByText('エラー');
    });

    it('shows server error message when fetch throws during submit', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, user: { id: 1, username: 'testuser' } }),
        })
        .mockRejectedValueOnce(new Error('Network error'));

      render(<ChangePasswordPage />);
      const currentInput = await screen.findByLabelText('現在のパスワード');
      const newInput = await screen.findByLabelText('新しいパスワード');
      const confirmInput = await screen.findByLabelText(/新しいパスワード（確認）/);

      fireEvent.change(currentInput, { target: { value: 'current123' } });
      fireEvent.change(newInput, { target: { value: 'newpass123' } });
      fireEvent.change(confirmInput, { target: { value: 'newpass123' } });

      await act(async () => {
        fireEvent.submit(screen.getByRole('button', { name: 'パスワードを変更' }).closest('form')!);
      });

      await screen.findByText('サーバーエラーが発生しました。');
    });
  });

  describe('fetch user info', () => {
    it('fetches user info on mount', async () => {
      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/auth/me');
      });
    });

    it('redirects to login when fetch user info fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });

    it('redirects to login when auth check returns not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false }),
      });

      render(<ChangePasswordPage />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });
});
