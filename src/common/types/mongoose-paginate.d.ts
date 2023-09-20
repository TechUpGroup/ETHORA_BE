/* eslint-disable @typescript-eslint/ban-types */
// Type definitions for mongoose-aggregate-paginate-v2 1.0
// Project: https://github.com/webgangster/mongoose-aggregate-paginate-v2
// Definitions by: Alexandre Croteau <https://github.com/acrilex1>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 3.2
//
// Based on type declarations for mongoose-paginate-v2 1.3.
//
// Thanks to knyuwork <https://github.com/knyuwork>
// and LiRen Tu <https://github.com/tuliren> for their contribution

declare module "mongoose" {
  interface CustomLabels {
    totalDocs?: string | undefined;
    limit?: string | undefined;
    page?: string | undefined;
    totalPages?: string | undefined;
    docs?: string | undefined;
    nextPage?: string | undefined;
    prevPage?: string | undefined;
    pagingCounter?: string | undefined;
    hasPrevPage?: string | undefined;
    hasNextPage?: string | undefined;
  }

  interface PaginateOptions {
    sort?: object | string | undefined;
    offset?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    customLabels?: CustomLabels | undefined;
    /* If pagination is set to `false`, it will return all docs without adding limit condition. (Default: `true`) */
    pagination?: boolean | undefined;
    allowDiskUse?: boolean | undefined;
    countQuery?: object | undefined;
  }

  interface QueryPopulateOptions {
    /** space delimited path(s) to populate */
    path: string;
    /** optional fields to select */
    select?: any;
    /** optional query conditions to match */
    match?: any;
    /** optional model to use for population */
    model?: string | Model<any> | undefined;
    /** optional query options like sort, limit, etc */
    options?: any;
    /** deep populate */
    populate?: QueryPopulateOptions | QueryPopulateOptions[] | undefined;
  }

  interface AggregatePaginateResult<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    page?: number | undefined;
    totalPages: number;
    nextPage?: number | null | undefined;
    prevPage?: number | null | undefined;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    meta?: any;
    [customLabel: string]: T[] | number | boolean | null | undefined;
  }

  interface AggregatePaginateModel<T extends Document> extends Model<T> {
    aggregatePaginate(
      query?: Aggregate<T[]>,
      options?: PaginateOptions,
      callback?: (err: any, result: AggregatePaginateResult<T>) => void,
    ): Promise<AggregatePaginateResult<T>>;
  }

  function model(name: string, schema?: Schema, collection?: string, skipInit?: boolean): AggregatePaginateModel<any>;
}

import mongoose = require("mongoose");
declare function mongooseAggregatePaginate(schema: mongoose.Schema): void;

declare namespace _ {
  const aggregatePaginate: { options: mongoose.PaginateOptions };
}

// Type definitions for mongoose-paginate-v2 1.3
// Project: https://github.com/webgangster/mongoose-paginate-v2
// Definitions by: Linus Brolin <https://github.com/linusbrolin>
//                 simonxca <https://github.com/simonxca>
//                 woutgg <https://github.com/woutgg>
//                 oktapodia <https://github.com/oktapodia>
//                 Dongjun Lee <https://github.com/ChazEpps>
//                 gamsterX <https://github.com/gamsterx>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Minimum TypeScript Version: 3.2
//
// Based on type declarations for mongoose-paginate 5.0.0.

declare module "mongoose" {
  interface CustomLabels {
    totalDocs?: string;
    limit?: string;
    page?: string;
    totalPages?: string;
    docs?: string;
    nextPage?: string;
    prevPage?: string;
  }

  interface ReadOptions {
    pref: string;
    tags?: any[];
  }

  interface PaginateOptions {
    select?: object | string;
    sort?: object | string;
    customLabels?: CustomLabels;
    // collation?: CollationOptions;
    populate?: object[] | string[] | object | string | QueryPopulateOptions;
    lean?: boolean;
    leanWithId?: boolean;
    offset?: number;
    page?: number;
    limit?: number;
    read?: ReadOptions;
    /* If pagination is set to `false`, it will return all docs without adding limit condition. (Default: `true`) */
    pagination?: boolean;
    projection?: any;
    // options?: QueryFindOptions;
  }

  interface QueryPopulateOptions {
    /** space delimited path(s) to populate */
    path: string;
    /** optional fields to select */
    select?: any;
    /** optional query conditions to match */
    match?: any;
    /** optional model to use for population */
    model?: string | Model<any>;
    /** optional query options like sort, limit, etc */
    options?: any;
    /** deep populate */
    populate?: QueryPopulateOptions | QueryPopulateOptions[];
  }

  interface PaginateResult<T> {
    docs: T[];
    totalDocs: number;
    limit: number;
    page?: number;
    totalPages: number;
    nextPage?: number | null;
    prevPage?: number | null;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    meta?: any;
    [customLabel: string]: T[] | number | boolean | null | undefined;
  }

  interface PaginateModel<T extends Document> extends AggregatePaginateModel<T> {
    paginate(
      query?: FilterQuery<T>,
      options?: PaginateOptions,
      callback?: (err: any, result: PaginateResult<T>) => void,
    ): Promise<PaginateResult<T>>;
  }

  function model(name: string, schema?: Schema, collection?: string, skipInit?: boolean): PaginateModel<any>;
}

declare function _(schema: mongoose.Schema): void;
declare namespace _ {
  const paginate: { options: mongoose.PaginateOptions };
}

export { mongooseAggregatePaginate, _ };
