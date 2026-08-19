import { onBeforeUnmount, ref } from 'vue';
import type { Instrument } from '../../domain/instrument/Instrument.js';
import type {
  SongInstrumentDetailResponse,
  SongInstrumentListItemResponse,
} from '../../domain/song/SongInstrumentResponse.js';

type InstrumentNameMap = Record<string, string>;

interface UseSongInstrumentCatalogUseCases {
  getInstrumentsUseCase: { run(): Promise<Instrument[]> };
  getInstrumentByIdUseCase: { run(instrumentId: string): Promise<Instrument> };
}

/**
 * Loads and caches the instrument catalog used to resolve song instrument names, deduplicating
 * concurrent requests for both the full catalog and individual instrument details.
 */
export function useSongInstrumentCatalog(useCases: UseSongInstrumentCatalogUseCases) {
  const { getInstrumentsUseCase, getInstrumentByIdUseCase } = useCases;

  const availableInstruments = ref<Instrument[]>([]);
  const catalogInstrumentNames = ref<InstrumentNameMap>({});

  const instrumentDetailRequests = new Map<string, Promise<void>>();
  let availableInstrumentsRequest: Promise<void> | null = null;
  let isComposableMounted = true;

  onBeforeUnmount(() => {
    isComposableMounted = false;
  });

  function getSongInstrumentCatalogId(
    instrument: SongInstrumentListItemResponse | SongInstrumentDetailResponse,
  ): string {
    return instrument.instrumentId ?? instrument.instrumentType ?? '';
  }

  function setCatalogInstrumentName(instrumentId: string, name: string): void {
    catalogInstrumentNames.value = {
      ...catalogInstrumentNames.value,
      [instrumentId]: name,
    };
  }

  function getCatalogInstrumentName(instrumentId: string): string {
    return (
      catalogInstrumentNames.value[instrumentId] ??
      availableInstruments.value.find((instrument) => instrument.id.value === instrumentId)?.name
        .value ??
      instrumentId
    );
  }

  async function ensureAvailableInstrumentsLoaded(): Promise<void> {
    if (availableInstruments.value.length > 0) {
      return;
    }

    if (availableInstrumentsRequest) {
      return availableInstrumentsRequest;
    }

    availableInstrumentsRequest = (async () => {
      try {
        const instruments = await getInstrumentsUseCase.run();
        if (!isComposableMounted) {
          return;
        }

        availableInstruments.value = [...instruments].sort((a, b) =>
          a.name.value.localeCompare(b.name.value),
        );
      } catch {
        if (isComposableMounted) {
          availableInstruments.value = [];
        }
      } finally {
        availableInstrumentsRequest = null;
      }
    })();

    return availableInstrumentsRequest;
  }

  async function ensureCatalogInstrumentNameLoaded(instrumentId: string): Promise<void> {
    if (!instrumentId || catalogInstrumentNames.value[instrumentId]) {
      return;
    }

    const currentRequest = instrumentDetailRequests.get(instrumentId);
    if (currentRequest) {
      return currentRequest;
    }

    const request = (async () => {
      const instrument = await getInstrumentByIdUseCase.run(instrumentId);
      if (!isComposableMounted) {
        return;
      }

      setCatalogInstrumentName(instrument.id.value, instrument.name.value);
    })().finally(() => {
      instrumentDetailRequests.delete(instrumentId);
    });

    instrumentDetailRequests.set(instrumentId, request);
    return request;
  }

  async function preloadCatalogInstrumentNames(
    instruments: SongInstrumentListItemResponse[],
  ): Promise<void> {
    const uniqueInstrumentIds = [...new Set(instruments.map(getSongInstrumentCatalogId))].filter(
      (instrumentId) => instrumentId.length > 0,
    );

    await Promise.all(
      uniqueInstrumentIds.map(async (instrumentId) => {
        try {
          await ensureCatalogInstrumentNameLoaded(instrumentId);
        } catch {
          // Keep the fallback name when the catalog detail cannot be resolved.
        }
      }),
    );
  }

  return {
    availableInstruments,
    catalogInstrumentNames,
    ensureAvailableInstrumentsLoaded,
    ensureCatalogInstrumentNameLoaded,
    preloadCatalogInstrumentNames,
    getCatalogInstrumentName,
    getSongInstrumentCatalogId,
  };
}
