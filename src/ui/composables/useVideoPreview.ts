import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import type {
  SongInstrumentListItemResponse,
  SongInstrumentVideoResponse,
} from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';

interface UseVideoPreviewDeps {
  getEffectiveVideo: (songId: string, instrumentId: string) => SongInstrumentVideoResponse | null;
  getSongInstrumentDisplayName: (instrument: SongInstrumentListItemResponse) => string;
  getSongInstrumentMusicianDisplayName: (instrument: SongInstrumentListItemResponse) => string;
}

/**
 * Manages the song-instrument video preview modal state, resolving the effective video and title.
 */
export function useVideoPreview(deps: UseVideoPreviewDeps) {
  const { getEffectiveVideo, getSongInstrumentDisplayName, getSongInstrumentMusicianDisplayName } =
    deps;
  const { t } = useI18n();

  const activeVideoPreview = ref<{ url: string; title: string } | null>(null);
  const videoPreviewModalRef = ref<HTMLElement | null>(null);

  function openVideoPreview(
    song: SongResponse,
    instrument: SongInstrumentListItemResponse,
  ): void {
    const video = getEffectiveVideo(song.id, instrument.id);
    if (!video) {
      return;
    }

    activeVideoPreview.value = {
      url: video.url,
      title: t('dashboard.songs.videoPreviewTitle', {
        songTitle: song.title,
        instrumentName: getSongInstrumentDisplayName(instrument),
        musicianName: getSongInstrumentMusicianDisplayName(instrument),
      }),
    };
  }

  function closeVideoPreview(): void {
    activeVideoPreview.value = null;
  }

  return {
    activeVideoPreview,
    videoPreviewModalRef,
    openVideoPreview,
    closeVideoPreview,
  };
}
