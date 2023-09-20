export const transformSortBy = (sortBy: string) => {
  let sort = {};
  if (sortBy) {
    const arrSort = sortBy.split(":");
    if (arrSort.length === 2) {
      const sortValue = arrSort[0];
      const sortType: any = arrSort[1].toUpperCase() === "DESC" ? -1 : 1;
      sort = { [sortValue]: sortType };
    }
  } else {
    sort = { createdAt: -1 };
  }
  return sort;
};
