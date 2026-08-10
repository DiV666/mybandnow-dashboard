import { onBeforeUnmount, ref } from 'vue';
import type { MusicianSummaryResponse } from '../../domain/musician/MusicianSummaryResponse.js';
import type { SongInstrumentListItemResponse } from '../../domain/song/SongInstrumentResponse.js';

type MusicianDisplayNameMap = Record<string, string>;

interface UseMusicianDisplayNamesUseCases {
  getMusicianByIdUseCase: { run(musicianId: string): Promise<MusicianSummaryResponse | null> };
}

/**
 * Loads and caches musician display names used across song instrument assignments, deduplicating
 * concurrent requests for the same musician id.
 */
export function useMusicianDisplayNames(useCases: UseMusicianDisplayNamesUseCases) {
  const { getMusicianByIdUseCase } = useCases;

  const musicianDisplayNames = ref<MusicianDisplayNameMap>({});

  const musicianDetailRequests = new Map<string, Promise<void>>();
  let isComposableMounted = true;

  onBeforeUnmount(() => {
    isComposableMounted = false;
  });

  function setMusicianDisplayName(musicianId: string, displayName: string): void {
    musicianDisplayNames.value = {
      ...musicianDisplayNames.value,
      [musicianId]: displayName,
    };
  }

  function resolveMusicianDisplayName(name: string, username: string): string {
    const trimmedName = name.trim();
    if (trimmedName.length > 0) {
      return trimmedName;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0) {
      return `@${trimmedUsername}`;
    }

    return '';
  }

  async function ensureMusicianDisplayNameLoaded(musicianId: string): Promise<void> {
    if (!musicianId || musicianDisplayNames.value[musicianId]) {
      return;
    }

    const currentRequest = musicianDetailRequests.get(musicianId);
    if (currentRequest) {
      return currentRequest;
    }

    const request = (async () => {
      const musician = await getMusicianByIdUseCase.run(musicianId);
      if (!isComposableMounted || !musician) {
        return;
      }

      const displayName = resolveMusicianDisplayName(musician.name, musician.username);
      if (!displayName) {
        return;
      }

      setMusicianDisplayName(musician.id, displayName);
    })().finally(() => {
      musicianDetailRequests.delete(musicianId);
    });

    musicianDetailRequests.set(musicianId, request);
    return request;
  }

  async function preloadMusicianDisplayNames(
    instruments: SongInstrumentListItemResponse[],
  ): Promise<void> {
    const uniqueMusicianIds = [...new Set(instruments.map((instrument) => instrument.musicianId))]
      .filter((musicianId) => musicianId.length > 0);

    await Promise.all(
      uniqueMusicianIds.map(async (musicianId) => {
        try {
          await ensureMusicianDisplayNameLoaded(musicianId);
        } catch {
          // Keep the raw musician id visible when the profile lookup fails.
        }
      }),
    );
  }

  return {
    musicianDisplayNames,
    resolveMusicianDisplayName,
    ensureMusicianDisplayNameLoaded,
    preloadMusicianDisplayNames,
  };
}
