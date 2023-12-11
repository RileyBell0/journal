
// Represents the generic declaration for a page of results - the data, and if there's more
type PagedResult<T> = {
    data: T,
    more: boolean
};

export { type PagedResult };