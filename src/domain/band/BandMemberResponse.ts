export const bandMemberRoles = {
	ADMIN: "ADMIN",
	MEMBER: "MEMBER",
} as const;

export type BandMemberRole =
	(typeof bandMemberRoles)[keyof typeof bandMemberRoles];

export interface BandMemberResponse {
	musicianId: string;
	role: BandMemberRole;
}

export interface BandMemberCollectionResponse {
	items: BandMemberResponse[];
	total: number;
}
