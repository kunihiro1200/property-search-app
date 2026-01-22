import { Helmet } from 'react-helmet-async';

interface StructuredDataProps {
  data: any;
}

/**
 * StructuredDataコンポーネント
 * 
 * JSON-LD形式の構造化データをページに埋め込みます。
 * Google検索結果でリッチスニペットを表示するために使用します。
 * 
 * @param data - 構造化データオブジェクト
 */
export const StructuredData: React.FC<StructuredDataProps> = ({ data }) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};

/**
 * 複数の構造化データを埋め込むコンポーネント
 */
export const MultipleStructuredData: React.FC<{ dataList: any[] }> = ({ dataList }) => {
  return (
    <Helmet>
      {dataList.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
};
