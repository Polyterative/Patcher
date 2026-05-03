import { RackBrowserDetailViewComponent } from './rack-browser-detail-view.component';

describe('RackBrowserDetailViewComponent', () => {
  let component: RackBrowserDetailViewComponent;

  beforeEach(() => {
    component = new RackBrowserDetailViewComponent(
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  function makeRackedModule(
    moduleId: number,
    hp: number,
    powerPos12: number | null,
    powerNeg12: number | null,
    powerPos5: number | null
  ): any {
    return {
      module: {
        id: moduleId,
        hp,
        powerPos12,
        powerNeg12,
        powerPos5,
        depth: 10,
        weight: 100
      }
    };
  }

  it('keeps the power group focused on the three rack rail totals', () => {
    const rows = component.rackSummaryStatRows({hp: 84, rows: 2} as any, [
      [makeRackedModule(101, 8, 50, -20, 0)],
      [makeRackedModule(202, 10, 75, -35, 5)]
    ]);
    const powerGroup = rows[1][0];

    expect(powerGroup.items.map(item => item.label)).toEqual(['+12V', '-12V', '+5V']);
  });

});
