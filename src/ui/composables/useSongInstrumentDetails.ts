import { onBeforeUnmount, ref, type Ref } from 'vue';
import {
  songInstrumentUploadStatuses,
  type SongInstrumentDetailResponse,
  type SongInstrumentListItemResponse,
  type SongInstrumentUploadResponse,
  type SongInstrumentVideoResponse,
} from '../../domain/song/SongInstrumentResponse.js';
import type { SongResponse } from '../../domain/song/SongResponse.js';

type SongInstrumentMap = Record<string, SongInstrumentListItemResponse[]>;
type SongInstrumentDetailMap = Record<string, SongInstrumentDetailResponse>;

interface UseSongInstrumentDetailsUseCases {
  getSongInstrumentDetailUseCase: {
    run(songId: string, instrumentId: string): Promise<SongInstrumentDetailResponse>;
  };
}

interface UseSongInstrumentDetailsDeps extends UseSongInstrumentDetailsUseCases {
  songs: Ref<SongResponse[]>;
  songInstruments: Ref<SongInstrumentMap>;
  getSongInstrumentCatalogId: (
    instrument: SongInstrumentListItemResponse | SongInstrumentDetailResponse,
  ) => string;
  ensureCatalogInstrumentNameLoaded: (instrumentId: string) => Promise<void>;
  getCatalogInstrumentName: (instrumentId: string) => string;
  ensureMusicianDisplayNameLoaded: (musicianId: string) => Promise<void>;
}

/**
 * Owns the cached song instrument detail lookups (video, upload, catalog/musician resolution)
 * shared across the upload, assignment and edit flows for a song instrument.
 */
export function useSongInstrumentDetails(deps: UseSongInstrumentDetailsDeps) {
  const {
    songs,
    songInstruments,
    getSongInstrumentDetailUseCase,
    getSongInstrumentCatalogId,
    ensureCatalogInstrumentNameLoaded,
    getCatalogInstrumentName,
    ensureMusicianDisplayNameLoaded,
  } = deps;

  const songInstrumentDetails = ref<SongInstrumentDetailMap>({});

  let isComposableMounted = true;

  onBeforeUnmount(() => {
    isComposableMounted = false;
  });

  function getSongInstrumentUploadKey(songId: string, instrumentId: string): string {
    return `${songId}:${instrumentId}`;
  }

  function getSongInstrumentDetail(
    songId: string,
    instrumentId: string,
  ): SongInstrumentDetailResponse | null {
    return songInstrumentDetails.value[getSongInstrumentUploadKey(songId, instrumentId)] ?? null;
  }

  function setSongInstrumentDetail(detail: SongInstrumentDetailResponse): void {
    const key = getSongInstrumentUploadKey(detail.songId, detail.id);
    songInstrumentDetails.value = {
      ...songInstrumentDetails.value,
      [key]: detail,
    };

    const instruments = songInstruments.value[detail.songId] ?? [];
    songInstruments.value = {
      ...songInstruments.value,
      [detail.songId]: instruments.map((instrument) =>
        instrument.id === detail.id
          ? {
              ...instrument,
              name: detail.name,
              instrumentId: detail.instrumentId,
              instrumentType: detail.instrumentType,
              musicianId: detail.musicianId,
              upload: detail.upload,
            }
          : instrument,
      ),
    };
  }

  function isSongInstrumentInProgress(upload: SongInstrumentUploadResponse | null): boolean {
    return (
      upload?.status === songInstrumentUploadStatuses.PENDING ||
      upload?.status === songInstrumentUploadStatuses.READY ||
      upload?.status === songInstrumentUploadStatuses.PROCESSING
    );
  }

  function getEffectiveUpload(
    songId: string,
    instrument: SongInstrumentListItemResponse,
  ): SongInstrumentUploadResponse | null {
    const detailUpload = getSongInstrumentDetail(songId, instrument.id)?.upload ?? null;
    const instrumentUpload = instrument.upload ?? null;

    if (
      instrumentUpload &&
      (isSongInstrumentInProgress(instrumentUpload) ||
        instrumentUpload.status === songInstrumentUploadStatuses.FAILED)
    ) {
      return instrumentUpload;
    }

    return detailUpload ?? instrumentUpload;
  }

  function getEffectiveVideo(
    songId: string,
    instrumentId: string,
  ): SongInstrumentVideoResponse | null {
    const detailVideo = getSongInstrumentDetail(songId, instrumentId)?.video ?? null;
    if (detailVideo) {
      return detailVideo;
    }

    return getSongInstrument(songId, instrumentId)?.video ?? null;
  }

  function getSongInstrument(
    songId: string,
    instrumentId: string,
  ): SongInstrumentListItemResponse | null {
    return (
      songInstruments.value[songId]?.find((instrument) => instrument.id === instrumentId) ?? null
    );
  }

  function getSongInstrumentDisplayName(instrument: SongInstrumentListItemResponse): string {
    return getCatalogInstrumentName(getSongInstrumentCatalogId(instrument));
  }

  async function refreshSongInstrumentDetail(
    songId: string,
    instrumentId: string,
  ): Promise<SongInstrumentDetailResponse> {
    const detail = await getSongInstrumentDetailUseCase.run(songId, instrumentId);
    const catalogInstrumentId = getSongInstrumentCatalogId(detail);
    const isSongStillVisible = songs.value.some((song) => song.id === songId);
    if (isComposableMounted && isSongStillVisible) {
      setSongInstrumentDetail(detail);
    }
    if (catalogInstrumentId) {
      try {
        await ensureCatalogInstrumentNameLoaded(catalogInstrumentId);
      } catch {
        // Catalog name resolution must not break the song instrument flow.
      }
    }
    if (detail.musicianId) {
      try {
        await ensureMusicianDisplayNameLoaded(detail.musicianId);
      } catch {
        // Keep the raw musician id visible when the profile lookup fails.
      }
    }
    return detail;
  }

  return {
    songInstrumentDetails,
    getSongInstrumentDetail,
    setSongInstrumentDetail,
    getEffectiveUpload,
    getEffectiveVideo,
    getSongInstrument,
    isSongInstrumentInProgress,
    refreshSongInstrumentDetail,
    getSongInstrumentDisplayName,
  };
}
