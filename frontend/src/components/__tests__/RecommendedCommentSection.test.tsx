import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecommendedCommentSection from '../RecommendedCommentSection';
import publicApi from '../../services/publicApi';

// publicApiをモック
jest.mock('../../services/publicApi');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('RecommendedCommentSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ローディング中はスピナーを表示する', () => {
    const mockGet = jest.fn().mockImplementation(() => new Promise(() => {}));
    (publicApi.get as jest.Mock) = mockGet;

    render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('コメントがある場合、セクションを表示する', async () => {
    const mockComment = {
      comment: 'この物件は日当たりが良く、閑静な住宅街にあります。',
      propertyType: '土地',
    };

    const mockGet = jest.fn().mockResolvedValue({ data: mockComment });
    (publicApi.get as jest.Mock) = mockGet;

    render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('おすすめポイント')).toBeInTheDocument();
      expect(screen.getByText(mockComment.comment)).toBeInTheDocument();
    });
  });

  it('コメントがnullの場合、セクションを非表示にする', async () => {
    const mockResponse = {
      comment: null,
      propertyType: '土地',
    };

    const mockGet = jest.fn().mockResolvedValue({ data: mockResponse });
    (publicApi.get as jest.Mock) = mockGet;

    const { container } = render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('コメントが空文字列の場合、セクションを非表示にする', async () => {
    const mockResponse = {
      comment: '',
      propertyType: '土地',
    };

    const mockGet = jest.fn().mockResolvedValue({ data: mockResponse });
    (publicApi.get as jest.Mock) = mockGet;

    const { container } = render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('APIエラー時、セクションを非表示にする', async () => {
    const mockGet = jest.fn().mockRejectedValue(new Error('API Error'));
    (publicApi.get as jest.Mock) = mockGet;

    const { container } = render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    }, { timeout: 3000 });
  });

  it('複数行のコメントを正しく表示する', async () => {
    const mockComment = {
      comment: '1. 日当たり良好\n2. 閑静な住宅街\n3. 駅から徒歩5分',
      propertyType: '土地',
    };

    const mockGet = jest.fn().mockResolvedValue({ data: mockComment });
    (publicApi.get as jest.Mock) = mockGet;

    render(
      <RecommendedCommentSection propertyId="test-property-id" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('おすすめポイント')).toBeInTheDocument();
      // 改行が含まれるテキストは部分一致で確認
      expect(screen.getByText(/1\. 日当たり良好/)).toBeInTheDocument();
      expect(screen.getByText(/2\. 閑静な住宅街/)).toBeInTheDocument();
      expect(screen.getByText(/3\. 駅から徒歩5分/)).toBeInTheDocument();
    });
  });

  it('正しいAPIエンドポイントを呼び出す', async () => {
    const propertyId = 'test-property-123';
    const mockGet = jest.fn().mockResolvedValue({
      data: { comment: 'テストコメント', propertyType: '土地' },
    });
    (publicApi.get as jest.Mock) = mockGet;

    render(
      <RecommendedCommentSection propertyId={propertyId} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(`/properties/${propertyId}/recommended-comment`);
    });
  });
});
