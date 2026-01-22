import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Loader } from 'lucide-react';

interface TranscriptionSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

interface AudioPlayerProps {
  audioUrl: string;
  transcriptionSegments?: TranscriptionSegment[];
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  transcriptionSegments = [],
  onError,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  // 音声ファイルのロード
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setLoading(false);
    };

    const handleError = () => {
      const errorMessage = '音声ファイルの読み込みに失敗しました';
      setError(errorMessage);
      setLoading(false);
      onError?.(errorMessage);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, onError]);

  // 再生時間の更新
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // アクティブなセグメントを見つける
      const activeIndex = transcriptionSegments.findIndex(
        (segment) => audio.currentTime >= segment.startTime && audio.currentTime <= segment.endTime
      );
      setActiveSegmentIndex(activeIndex !== -1 ? activeIndex : null);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveSegmentIndex(null);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [transcriptionSegments]);

  // 再生/一時停止
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  // シーク
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // 10秒戻る
  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  // 10秒進む
  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  // 音量調整
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // ミュート切り替え
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setVolume(volume || 0.5);
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  // 再生速度変更
  const handlePlaybackRateChange = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // セグメントクリックで該当位置にジャンプ
  const handleSegmentClick = (segment: TranscriptionSegment) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = segment.startTime;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  // 時間フォーマット（秒 → MM:SS）
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center">
        <Loader className="w-6 h-6 text-blue-600 animate-spin mr-2" />
        <span className="text-gray-600">音声ファイルを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* 再生コントロール */}
      <div className="space-y-4">
        {/* プログレスバー */}
        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* コントロールボタン */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={skipBackward}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="10秒戻る"
          >
            <SkipBack className="w-6 h-6 text-gray-700" />
          </button>

          <button
            onClick={togglePlay}
            className="p-4 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
            title={isPlaying ? '一時停止' : '再生'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-white" />
            ) : (
              <Play className="w-8 h-8 text-white" />
            )}
          </button>

          <button
            onClick={skipForward}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="10秒進む"
          >
            <SkipForward className="w-6 h-6 text-gray-700" />
          </button>
        </div>

        {/* 音量と再生速度 */}
        <div className="flex items-center justify-between gap-4">
          {/* 音量コントロール */}
          <div className="flex items-center gap-2 flex-1">
            <button
              onClick={toggleMute}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title={isMuted ? 'ミュート解除' : 'ミュート'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gray-700" />
              ) : (
                <Volume2 className="w-5 h-5 text-gray-700" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* 再生速度 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">速度:</span>
            <div className="flex gap-1">
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <button
                  key={rate}
                  onClick={() => handlePlaybackRateChange(rate)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    playbackRate === rate
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 文字起こしとの同期表示 */}
      {transcriptionSegments.length > 0 && (
        <div className="mt-6 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">文字起こし</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {transcriptionSegments.map((segment, index) => (
              <div
                key={index}
                onClick={() => handleSegmentClick(segment)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  activeSegmentIndex === index
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-medium text-gray-500">
                      {formatTime(segment.startTime)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          segment.speaker === 'agent'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {segment.speaker === 'agent' ? '担当者' : '顧客'}
                      </span>
                      <span className="text-xs text-gray-500">
                        信頼度: {(segment.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p
                      className={`text-sm ${
                        activeSegmentIndex === index ? 'text-blue-900 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {segment.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
