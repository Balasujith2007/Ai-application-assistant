export declare class CreateEducationDto {
    institution: string;
    degree: string;
    fieldOfStudy?: string;
    startYear: number;
    endYear?: number;
    grade?: string;
}
export declare class UpdateEducationDto {
    institution?: string;
    degree?: string;
    fieldOfStudy?: string;
    startYear?: number;
    endYear?: number;
    grade?: string;
}
