import { ClassSerializerInterceptor, PlainLiteralObject, Type } from "@nestjs/common";
import { plainToClass } from "class-transformer";
import { Document } from "mongoose";

function MongooseClassSerializerInterceptor(classToIntercept: Type): typeof ClassSerializerInterceptor {
  return class Interceptor extends ClassSerializerInterceptor {
    private changePlainObjectToClass(document: PlainLiteralObject) {
      if (!(document instanceof Document)) {
        return document;
      }
      return plainToClass(classToIntercept, document.toJSON());
    }

    private prepareResponse(response: PlainLiteralObject | PlainLiteralObject[] | { [key: string]: any }) {
      if (!Array.isArray(response) && response?.docs) {
        const docs = this.prepareResponse(response.docs);
        return {
          ...response,
          docs,
        };
      }

      if (Array.isArray(response)) {
        return response.map(this.changePlainObjectToClass);
      }

      return this.changePlainObjectToClass(response);
    }

    serialize(response: PlainLiteralObject | PlainLiteralObject[]) {
      return this.prepareResponse(response);
    }
  };
}

export default MongooseClassSerializerInterceptor;
