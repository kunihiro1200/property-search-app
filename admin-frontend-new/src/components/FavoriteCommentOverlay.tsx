import React from 'react';
import './FavoriteCommentOverlay.css';

export interface FavoriteCommentOverlayProps {
  comment: string;
}

/**
 * お気に入り文言コンポーネント
 * 
 * 画像の上に吹き出しスタイルでオーバーレイ表示します。
 */
export const FavoriteCommentOverlay: React.FC<FavoriteCommentOverlayProps> = ({
  comment,
}) => {
  if (!comment || comment.trim() === '') {
    return null;
  }

  return (
    <div className="favorite-comment-container">
      <div className="favorite-comment-bubble">
        <div className="favorite-comment-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="favorite-comment-content">
          {comment}
        </div>
      </div>
    </div>
  );
};
