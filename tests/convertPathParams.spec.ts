import { convertPathParams } from "../src";

describe(convertPathParams.name, () => {
  it("should replace single parameterized segments correctly", () => {
    const result = convertPathParams("/users/:userId");
    expect(result).toEqual({
      path: "/users/{userId}",
      params: [ "userId" ]
    });
  });

  it("should handle multiple parameterized segments", () => {
    const result = convertPathParams("/users/:userId/posts/:postId");
    expect(result).toEqual({
      path: "/users/{userId}/posts/{postId}",
      params: [ "userId", "postId" ]
    });
  });

  it("should handle paths with no parameters", () => {
    const result = convertPathParams("/users/posts");
    expect(result).toEqual({
      path: "/users/posts",
      params: []
    });
  });

  it("should handle paths with trailing slashes", () => {
    const result = convertPathParams("/users/:userId/posts/:postId/");
    expect(result).toEqual({
      path: "/users/{userId}/posts/{postId}/",
      params: [ "userId", "postId" ]
    });
  });

  it("should handle paths with multiple slashes", () => {
    const result = convertPathParams("/users///:userId//posts/:postId");
    expect(result).toEqual({
      path: "/users/{userId}/posts/{postId}",
      params: [ "userId", "postId" ]
    });
  });

  it("should handle paths with non-word characters in parameters", () => {
    const result = convertPathParams("/products/:product-id");
    expect(result).toEqual({
      path: "/products/{product-id}",
      params: [ "product-id" ]
    });
  });

  it("should handle paths with parameters containing numbers", () => {
    const result = convertPathParams("/api/:version1/:id123");
    expect(result).toEqual({
      path: "/api/{version1}/{id123}",
      params: [ "version1", "id123" ]
    });
  });

  it("should handle empty paths", () => {
    const result = convertPathParams("");
    expect(result).toEqual({
      path: "",
      params: []
    });
  });

  it("should handle paths with only one parameter", () => {
    const result = convertPathParams("/:onlyParam");
    expect(result).toEqual({
      path: "/{onlyParam}",
      params: [ "onlyParam" ]
    });
  });

  it("should handle paths with special characters", () => {
    const result = convertPathParams("/path-with-special_chars-:param123");
    expect(result).toEqual({
      path: "/path-with-special_chars-{param123}",
      params: [ "param123" ]
    });
  });
  
  it("should handle complex nested paths with multiple parameters", () => {
    const result = convertPathParams("/api/v1/users/:userId/orders/:orderId/items/:itemId");
    expect(result).toEqual({
      path: "/api/v1/users/{userId}/orders/{orderId}/items/{itemId}",
      params: [ "userId", "orderId", "itemId" ]
    });
  });
});
