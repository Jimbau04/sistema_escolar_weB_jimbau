import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent  } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { FacadeService } from 'src/app/services/facade.service';
import { MaestrosService } from 'src/app/services/maestros.service';
import { MatSort, Sort, MatSortModule} from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';


@Component({
  selector: 'app-maestros-screen',
  templateUrl: './maestros-screen.component.html',
  styleUrls: ['./maestros-screen.component.scss'],

})
export class MaestrosScreenComponent implements OnInit {

  public name_user: string = "";
  public rol: string = "";
  public token: string = "";
  public lista_maestros: any[] = [];

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  //Para la tabla
  displayedColumns: string[] = ['id_trabajador', 'nombre', 'email', 'fecha_nacimiento', 'telefono', 'rfc', 'cubiculo', 'area_investigacion', 'editar', 'eliminar'];
  dataSource = new MatTableDataSource<DatosUsuario>(this.lista_maestros as DatosUsuario[]);
  totalItems = 0;
  pageSize = 5;
  pageIndex = 0;
  sortField = '';
  sortDirection = '';
  searchValue = '';
  isLoading = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  constructor(
    public facadeService: FacadeService,
    public maestrosService: MaestrosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.name_user = this.facadeService.getUserCompleteName();
    this.rol = this.facadeService.getUserGroup();
    //Validar que haya inicio de sesión
    //Obtengo el token del login
    this.token = this.facadeService.getSessionToken();
    console.log("Token: ", this.token);
    if(this.token == ""){
      this.router.navigate(["/"]);
    }
    //Obtener maestros
    this.obtenerMaestros();

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400), // Espera 400ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo busca si el valor cambió
    ).subscribe(searchValue => {
      console.log('🔍 Buscando:', searchValue);
      this.searchValue = searchValue;
      this.pageIndex = 0; // Resetear a la primera página
      this.obtenerMaestros();
    });


  }



  // Consumimos el servicio para obtener los maestros
  //Obtener maestros
  public obtenerMaestros() {
    this.maestrosService.obtenerListaMaestros(
      this.pageIndex + 1, // Django usa páginas base 1
      this.pageSize,
      this.sortField,
      this.sortDirection,
      this.searchValue
    ).subscribe(
      (response) => {
        this.lista_maestros = response;
        this.dataSource.data = response.results;
        this.totalItems = response.count;
        this.isLoading = false;
        console.log("Lista users: ", this.lista_maestros);
        console.log("Total items: ", this.totalItems);
        if (this.lista_maestros.length > 0) {
          //Agregar datos del nombre e email
          this.lista_maestros.forEach(usuario => {
            usuario.first_name = usuario.user.first_name;
            usuario.last_name = usuario.user.last_name;
            usuario.email = usuario.user.email;
          });
          console.log("Maestros: ", this.lista_maestros);

          this.dataSource = new MatTableDataSource<DatosUsuario>(this.lista_maestros as DatosUsuario[]);
        }
      }, (error) => {
        console.error("Error al obtener la lista de maestros: ", error);
        alert("No se pudo obtener la lista de maestros");
      }
    );
  }


  public goEditar(idUser: number) {
    this.router.navigate(["registro-usuarios/maestros/" + idUser]);
  }

  public delete(idUser: number) {

  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.obtenerMaestros();
  }

  onSortChange(sort: Sort) {
    this.sortField = sort.active;
    this.sortDirection = sort.direction;
    this.pageIndex = 0;
    this.obtenerMaestros();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    console.log('🔍 Input cambió a:', filterValue);

    // Enviar al subject para que aplique el debounce
    this.searchSubject.next(filterValue.trim().toLowerCase());
  }

}

//Esto va fuera de la llave que cierra la clase
export interface DatosUsuario {
  id: number,
  id_trabajador: number;
  first_name: string;
  last_name: string;
  email: string;
  fecha_nacimiento: string,
  telefono: string,
  rfc: string,
  cubiculo: string,
  area_investigacion: number,
}

