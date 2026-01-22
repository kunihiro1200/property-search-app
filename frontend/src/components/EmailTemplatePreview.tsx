import React, { useState } from 'react';

interface EmailTemplatePreviewProps {
  emailContent: {
    subject: string;
    body: string;
    properties: Array<{
      propertyNumber: string;
      address: string;
      athomeUrl: string | null;
      preViewingInfo: string | null;
    }>;
  };
  onEdit: (newBody: string) => void;
  editable: boolean;
}

export const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({
  emailContent,
  onEdit,
  editable,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(emailContent.body);

  const handleSaveEdit = () => {
    onEdit(editedBody);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedBody(emailContent.body);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          件名
        </label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-900">{emailContent.subject}</p>
        </div>
      </div>

      {/* Body */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">
            本文
          </label>
          {editable && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              編集
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                保存
              </button>
            </div>
          </div>
        ) : (
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-900 whitespace-pre-wrap font-sans">
              {emailContent.body}
            </pre>
          </div>
        )}
      </div>

      {/* Property Info Summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          物件情報
        </label>
        <div className="space-y-3">
          {emailContent.properties.map((property, index) => (
            <div
              key={property.propertyNumber}
              className="p-3 bg-blue-50 border border-blue-200 rounded-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {property.propertyNumber}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {property.address}
                  </p>
                  {property.athomeUrl && (
                    <p className="text-xs text-blue-600 mt-1 truncate">
                      {property.athomeUrl}
                    </p>
                  )}
                </div>
                <div className="ml-3">
                  {property.preViewingInfo ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      内覧前伝達事項あり
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      内覧前伝達事項なし
                    </span>
                  )}
                </div>
              </div>
              {property.preViewingInfo && (
                <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                  <p className="text-xs text-gray-700 whitespace-pre-wrap">
                    {property.preViewingInfo}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
