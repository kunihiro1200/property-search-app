import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublicUrlCell from '../PublicUrlCell';

// navigator.clipboardのモック
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('PublicUrlCell', () => {
  const testPropertyId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    mockClipboard.writeText.mockClear();
  });

  it('公開中の物件のURLをリンクとして表示', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
      />
    );

    // URLリンクが表示されることを確認
    const link = screen.getByRole('link', { name: /\.\.\.properties\// });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining(`/public/properties/${testPropertyId}`));
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('一般・公開中の物件のURLをリンクとして表示', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="一般・公開中"
      />
    );

    // URLリンクが表示されることを確認
    const link = screen.getByRole('link', { name: /\.\.\.properties\// });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining(`/public/properties/${testPropertyId}`));
  });

  it('非公開物件は「-」を表示', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="契約済"
      />
    );

    // 「-」が表示されることを確認
    expect(screen.getByText('-')).toBeInTheDocument();
    // リンクが存在しないことを確認
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('atbb_statusがnullの場合は「-」を表示', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus={null}
      />
    );

    // 「-」が表示されることを確認
    expect(screen.getByText('-')).toBeInTheDocument();
    // リンクが存在しないことを確認
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('新しいタブで開くボタンが表示される', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
      />
    );

    // 新しいタブで開くボタンが表示されることを確認
    const buttons = screen.getAllByRole('button');
    const openInNewButton = buttons.find(button => 
      button.querySelector('[data-testid="OpenInNewIcon"]')
    );
    expect(openInNewButton).toBeInTheDocument();
  });

  it('コピーボタンをクリックするとURLがコピーされる', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);

    const onCopy = vi.fn();
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
        onCopy={onCopy}
      />
    );

    // コピーボタンを見つける（ContentCopyIconを持つボタン）
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => 
      button.querySelector('[data-testid="ContentCopyIcon"]')
    );
    expect(copyButton).toBeInTheDocument();
    
    fireEvent.click(copyButton!);

    // クリップボードにコピーされたことを確認
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining(`/public/properties/${testPropertyId}`)
      );
    });

    // onCopyコールバックが呼ばれたことを確認
    expect(onCopy).toHaveBeenCalledWith(
      expect.stringContaining(`/public/properties/${testPropertyId}`)
    );
  });

  it('コピー成功後にチェックアイコンが表示される', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);

    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
      />
    );

    // コピーボタンをクリック
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => 
      button.querySelector('[data-testid="ContentCopyIcon"]')
    );
    fireEvent.click(copyButton!);

    // チェックアイコンが表示されることを確認
    await waitFor(() => {
      expect(screen.getByTestId('CheckIcon')).toBeInTheDocument();
    });
  });

  it('URLリンクをクリックすると新しいタブで開く', () => {
    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
      />
    );

    // URLリンクをクリック
    const link = screen.getByRole('link', { name: /\.\.\.properties\// });
    
    // リンクの属性を確認（実際のクリックはブラウザが処理）
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('コピー失敗時にフォールバック処理が実行される', async () => {
    // クリップボードAPIが失敗する場合をシミュレート
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard API not available'));

    // document.execCommandのモック
    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    render(
      <PublicUrlCell
        propertyId={testPropertyId}
        atbbStatus="専任・公開中"
      />
    );

    // コピーボタンをクリック
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => 
      button.querySelector('[data-testid="ContentCopyIcon"]')
    );
    fireEvent.click(copyButton!);

    // フォールバック処理が実行されることを確認
    await waitFor(() => {
      expect(mockExecCommand).toHaveBeenCalledWith('copy');
    });
  });
});
