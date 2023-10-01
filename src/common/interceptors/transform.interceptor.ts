import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const { docs, ...others } = data;
        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: data.message,
          data: docs
            ? {
                result: docs,
                meta: others,
              }
            : others,
        } as Response<T>;
      }),
    );
  }
}
