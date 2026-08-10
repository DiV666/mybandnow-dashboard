import { AddBandMemberUseCase } from "../../application/band/AddBandMemberUseCase.js";
import { CreateBandUseCase } from "../../application/band/CreateBandUseCase.js";
import { GetBandMembersUseCase } from "../../application/band/GetBandMembersUseCase.js";
import { GetMyBandsUseCase } from "../../application/band/GetMyBandsUseCase.js";
import { LoginUseCase } from "../../application/auth/LoginUseCase.js";
import { GetInstrumentByIdUseCase } from "../../application/instrument/GetInstrumentByIdUseCase.js";
import { GetInstrumentsUseCase } from "../../application/instrument/GetInstrumentsUseCase.js";
import { CreateProfileUseCase } from "../../application/musician/CreateProfileUseCase.js";
import { GetMusicianByIdUseCase } from "../../application/musician/GetMusicianByIdUseCase.js";
import { GetMyProfileUseCase } from "../../application/musician/GetMyProfileUseCase.js";
import { AssignSongInstrumentMusicianUseCase } from "../../application/song/AssignSongInstrumentMusicianUseCase.js";
import { CreateSongInstrumentUseCase } from "../../application/song/CreateSongInstrumentUseCase.js";
import { CreateSongUseCase } from "../../application/song/CreateSongUseCase.js";
import { GetBandSongsUseCase } from "../../application/song/GetBandSongsUseCase.js";
import { GetSongInstrumentDetailUseCase } from "../../application/song/GetSongInstrumentDetailUseCase.js";
import { GetSongInstrumentsUseCase } from "../../application/song/GetSongInstrumentsUseCase.js";
import { InviteSongInstrumentMusicianUseCase } from "../../application/song/InviteSongInstrumentMusicianUseCase.js";
import { UpdateSongInstrumentUseCase } from "../../application/song/UpdateSongInstrumentUseCase.js";
import { UploadSongInstrumentVideoUseCase } from "../../application/song/UploadSongInstrumentVideoUseCase.js";
import { AxiosAuthRepository } from "../../infrastructure/auth/AxiosAuthRepository.js";
import { AxiosBandRepository } from "../../infrastructure/band/AxiosBandRepository.js";
import { AxiosInstrumentRepository } from "../../infrastructure/instrument/AxiosInstrumentRepository.js";
import { AxiosMusicianRepository } from "../../infrastructure/musician/AxiosMusicianRepository.js";
import { AxiosSongRepository } from "../../infrastructure/song/AxiosSongRepository.js";

const authRepository = new AxiosAuthRepository();
const bandRepository = new AxiosBandRepository();
const instrumentRepository = new AxiosInstrumentRepository();
const musicianRepository = new AxiosMusicianRepository();
const songRepository = new AxiosSongRepository();

const addBandMemberUseCase = new AddBandMemberUseCase(bandRepository);
const assignSongInstrumentMusicianUseCase = new AssignSongInstrumentMusicianUseCase(
	songRepository,
);
const createBandUseCase = new CreateBandUseCase(bandRepository);
const createProfileUseCase = new CreateProfileUseCase(musicianRepository);
const createSongInstrumentUseCase = new CreateSongInstrumentUseCase(songRepository);
const createSongUseCase = new CreateSongUseCase(songRepository);
const getBandMembersUseCase = new GetBandMembersUseCase(bandRepository);
const getBandSongsUseCase = new GetBandSongsUseCase(songRepository);
const getInstrumentByIdUseCase = new GetInstrumentByIdUseCase(instrumentRepository);
const getInstrumentsUseCase = new GetInstrumentsUseCase(instrumentRepository);
const getMusicianByIdUseCase = new GetMusicianByIdUseCase(musicianRepository);
const getMyBandsUseCase = new GetMyBandsUseCase(bandRepository);
const getMyProfileUseCase = new GetMyProfileUseCase(musicianRepository);
const getSongInstrumentDetailUseCase = new GetSongInstrumentDetailUseCase(
	songRepository,
);
const getSongInstrumentsUseCase = new GetSongInstrumentsUseCase(songRepository);
const inviteSongInstrumentMusicianUseCase = new InviteSongInstrumentMusicianUseCase(
	songRepository,
);
const loginUseCase = new LoginUseCase(authRepository);
const updateSongInstrumentUseCase = new UpdateSongInstrumentUseCase(songRepository);
const uploadSongInstrumentVideoUseCase = new UploadSongInstrumentVideoUseCase(
	songRepository,
);

export const container = {
	repositories: {
		authRepository,
		bandRepository,
		instrumentRepository,
		musicianRepository,
		songRepository,
	},
	useCases: {
		addBandMemberUseCase,
		assignSongInstrumentMusicianUseCase,
		createBandUseCase,
		createProfileUseCase,
		createSongInstrumentUseCase,
		createSongUseCase,
		getBandMembersUseCase,
		getBandSongsUseCase,
		getInstrumentByIdUseCase,
		getInstrumentsUseCase,
		getMusicianByIdUseCase,
		getMyBandsUseCase,
		getMyProfileUseCase,
		getSongInstrumentDetailUseCase,
		getSongInstrumentsUseCase,
		inviteSongInstrumentMusicianUseCase,
		loginUseCase,
		updateSongInstrumentUseCase,
		uploadSongInstrumentVideoUseCase,
	},
};
