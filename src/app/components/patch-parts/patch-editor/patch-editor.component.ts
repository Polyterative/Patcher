import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Subject
} from 'rxjs';
import {
  map,
  takeUntil
} from 'rxjs/operators';
import {
  MAX_INSTANCES_PER_MODULE,
  PatchDetailDataService
} from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Patch } from 'src/app/models/patch';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';


/** One card in the editor module list */
export interface EditorModuleCard {
  module: DbModule;
  /** Set when an instance exists for this card; undefined for modules with 0 instances */
  instance: PatchModuleInstance | undefined;
  /** Display label — only set when there are 2+ instances of the same module */
  label: string | undefined;
  /** How many instances of this module exist in the patch (for showing/hiding delete button) */
  instanceCount: number;
  /** How many connections reference this instance (for indicator + delete confirmation) */
  connectionCount: number;
  /** Human-readable connection summaries for tooltip (max 10) */
  connectionNames: string[];
  /**
   * Stable identity key for @for tracking.
   * Uses instance.id when set; falls back to -(module.id) so the key never flips
   * when the first instance is created (avoids DOM re-creation → no re-animation).
   */
  trackingId: number;
}

@Component({
  selector: 'app-patch-editor',
  templateUrl: './patch-editor.component.html',
  styleUrls: ['./patch-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchEditorComponent implements OnInit, OnDestroy {
  @Input() data: Patch;
  //
  readonly maxInstances = MAX_INSTANCES_PER_MODULE;
  modulesViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:        true,
    hideManufacturer:  true,
    hideDescription:   true,
    hideButtons:       true,
    hideHP:            true,
    hideDates:         true,
    hidePanelsOptions: true
  };
  
  /** Collection modules + instances merged into a flat card list */
  editorCards$ = new BehaviorSubject<EditorModuleCard[]>([]);
  
  /** Module IDs currently in-flight for copy — prevents spam-clicking */
  addingCopy = new Set<number>();
  
  /** Whether collection modules have been loaded at least once */
  collectionLoaded$ = new BehaviorSubject<boolean>(false);
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public backend: SupabaseService,
    public dataService: PatchDetailDataService
  ) {
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
    // Fetch user's collection modules once
    this.backend.GET.currentUserModules()
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe((modules: DbModule[]) => {
        this.dataService.collectionModules$.next(modules);
        this.collectionLoaded$.next(true);
      });
    
    // Merge collection modules + instances + connections into editor cards whenever any changes
    combineLatest([
      this.dataService.collectionModules$,
      this.dataService.patchModuleInstances$,
      this.dataService.editorConnections$
    ])
      .pipe(
        map(([modules, instances, connections]) =>
          this.buildEditorCards(modules, instances, connections || [])),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(cards => {
        // Clear in-flight copy flags for modules whose cards have updated
        this.addingCopy.clear();
        this.editorCards$.next(cards);
      });
  }
  
  /** Trigger adding another copy of the same module */
  onAddCopy(card: EditorModuleCard): void {
    this.addingCopy.add(card.module.id);
    this.dataService.addModuleInstance$.next(card.module);
  }
  
  /**
   * Merge collection modules with instances into a flat list of cards.
   *
   * - Module with 0 instances → 1 card (no instanceId, no label)
   * - Module with 1 instance  → 1 card (instanceId set, no label)
   * - Module with N instances → N cards (each with instanceId + label "(1)", "(2)", …)
   */
  private buildEditorCards(
    modules: DbModule[],
    instances: PatchModuleInstance[],
    connections: PatchConnection[]
  ): EditorModuleCard[] {
    const cards: EditorModuleCard[] = [];
    
    // Group instances by module_id
    const instancesByModule = new Map<number, PatchModuleInstance[]>();
    for (const inst of instances) {
      const list = instancesByModule.get(inst.module_id) || [];
      list.push(inst);
      instancesByModule.set(inst.module_id, list);
    }
    
    for (const module of modules) {
      const moduleInstances = instancesByModule.get(module.id) || [];
      const count = moduleInstances.length;
      
      if (count <= 1) {
        const inst = moduleInstances[0] ?? undefined;
        const instConns = inst
          ? connections.filter(c => c.instance_id_a === inst.id || c.instance_id_b === inst.id)
          : [];
        // 0 or 1 instance → single card
        cards.push({
          module,
          instance: inst,
          label: undefined,
          instanceCount: count,
          connectionCount: instConns.length,
          connectionNames: this.buildConnectionNames(instConns, inst?.id),
          // Stable key: prefer instance.id; fall back to negative module.id so the key
          // never changes when the first instance is lazily created (prevents re-animation).
          trackingId: inst?.id ?? -module.id
        });
      } else {
        // N instances → N cards with labels
        moduleInstances.forEach((inst, idx) => {
          const instConns = connections.filter(
            c => c.instance_id_a === inst.id || c.instance_id_b === inst.id
          );
          cards.push({
            module,
            instance: inst,
            label: inst.instance_label || `(${ idx + 1 })`,
            instanceCount: count,
            connectionCount: instConns.length,
            connectionNames: this.buildConnectionNames(instConns, inst.id),
            trackingId: inst.id
          });
        });
      }
    }
    
    return cards;
  }
  
  /**
   * Build human-readable connection summaries for an instance's tooltip.
   * Shows "CV → OtherModule: CV" for each connection, capped at 10.
   */
  private buildConnectionNames(
    conns: PatchConnection[],
    instanceId: number | undefined
  ): string[] {
    if (!instanceId || conns.length === 0) return [];
    
    const names = conns.slice(0, 10).map(c => {
      const isA = c.instance_id_a === instanceId;
      const thisCv = isA ? c.a : c.b;
      const otherCv = isA ? c.b : c.a;
      return `${ thisCv.name } → ${ otherCv.module.name }: ${ otherCv.name }`;
    });
    
    if (conns.length > 10) {
      names.push(`… and ${ conns.length - 10 } more`);
    }
    
    return names;
  }
}