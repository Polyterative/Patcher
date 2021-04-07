export class AppTablesUtils {

  public static nestedObjectsFilterPredicate: (data, filter: string) => boolean = (data, filter: string) => {
    const accumulator = (currentTerm, key) => {
      return AppTablesUtils.nestedFilterCheck(currentTerm, data, key);
    };
    const dataStr = Object.keys(data)
                          .reduce(accumulator, '')
                          .toLowerCase();
    // Transform the filter by converting it to lowercase and removing whitespace.
    const transformedFilter = filter.trim()
                                    .toLowerCase();
    return dataStr.indexOf(transformedFilter) !== -1;
  };

  public static nestedObjectsfilterPredicateIgnoreColumns(columns: string[]) {

    return (data, filter: string) => {
      const accumulator = (currentTerm, key) => {
        return AppTablesUtils.nestedFilterCheck(currentTerm, data, key);
      };
      let keys: string[] = Object.keys(data);


      keys = keys.filter(item => columns.indexOf(item) < 0);

      const dataStr = keys
      .reduce(accumulator, '')
      .toLowerCase();

      // Transform the filter by converting it to lowercase and removing whitespace.
      const transformedFilter = filter.trim()
                                      .toLowerCase();
      return dataStr.indexOf(transformedFilter) !== -1;
    };
  }


  /**
   * https://stackoverflow.com/questions/49833315/angular-material-2-datasource-filter-with-nested-object
   */
  public static nestedFilterCheck(search, data, key) {
    if (typeof data[key] === 'object') {
      for (const k in data[key]) {
        if (data[key][k] !== null) {
          search = this.nestedFilterCheck(search, data[key], k);
        }
      }
    } else {
      search += data[key];
    }
    return search;
  }
}
