import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent  } from '@angular/material/paginator';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { FacadeService } from 'src/app/services/facade.service';
import { AlumnosService } from 'src/app/services/alumnos.service';
import { MatSort, Sort, MatSortModule} from '@angular/material/sort';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { EliminarUserModalComponent } from 'src/app/modals/eliminar-user-modal/eliminar-user-modal.component';


@Component({
  selector: 'app-alumnos-screen',
  templateUrl: './alumnos-screen.component.html',
  styleUrls: ['./alumnos-screen.component.scss']
})
export class AlumnosScreenComponent implements OnInit {

  public name_user: string = "";
  public rol: string = "";
  public token: string = "";
  public lista_alumnos: any[] = [];

  //Para la tabla
    displayedColumns: string[] = ['matricula', 'nombre', 'email', 'fecha_nacimiento', 'telefono', 'rfc', 'curp', 'editar', 'eliminar'];
    dataSource = new MatTableDataSource<DatosUsuario>(this.lista_alumnos as DatosUsuario[]);
    totalItems = 0;
    pageSize = 5;
    pageIndex = 0;
    sortField = '';
    sortDirection = '';
    searchValue = '';
    isLoading = false;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  constructor(
      public facadeService: FacadeService,
      public alumnosService: AlumnosService,
      private router: Router,
      public dialog: MatDialog,
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
    this.obtenerAlumnos();


    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400), // Espera 400ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo busca si el valor cambió
    ).subscribe(searchValue => {
      console.log('🔍 Buscando:', searchValue);
      this.searchValue = searchValue;
      this.pageIndex = 0; // Resetear a la primera página
      this.obtenerAlumnos();
    });
    throw new Error('Method not implemented.');
  }

  public obtenerAlumnos(){

    this.alumnosService.obtenerListaAlumnos(
      this.pageIndex + 1, // Django usa páginas base 1
      this.pageSize,
      this.sortField,
      this.sortDirection,
      this.searchValue
    ).subscribe(
      (response) => {
        this.lista_alumnos = response;
        this.dataSource.data = response.results;
        this.totalItems = response.count;
        console.log("Lista users: ", this.lista_alumnos);
        console.log("Total items: ", this.totalItems);
        if (this.lista_alumnos.length > 0) {
          //Agregar datos del nombre e email
          this.lista_alumnos.forEach(usuario => {
            usuario.first_name = usuario.user.first_name;
            usuario.last_name = usuario.user.last_name;
            usuario.email = usuario.user.email;
          });
          console.log("Alumnos: ", this.lista_alumnos);

          this.dataSource = new MatTableDataSource<DatosUsuario>(this.lista_alumnos as DatosUsuario[]);
          console.log("Respuesta al obtener alumnos: ", response);
        }

      }, (error) => {
         console.error("Error al obtener la lista de alumnos: ", error);
        alert("No se pudo obtener la lista de maestros");
      }
    );
  }


  public goEditar(idUser: number) {
    this.router.navigate(["registro-usuarios/alumnos/" + idUser]);
  }

  public delete(idUser: number) {
    const userIdSession = Number(this.facadeService.getUserId());
    if(this.rol === 'administrador' || this.rol === 'alumnos' && userIdSession === idUser){
      const dialogRef = this.dialog.open(EliminarUserModalComponent, {
        data: { id: idUser, rol: 'alumno' },
        width: '328px',
        height: '288px',
    });
      dialogRef.afterClosed().subscribe(result => {
        if(result.isDelete){
          console.log("alumno eliminado: ", idUser);
          alert("alumno eliminado correctamente");
          window.location.reload();
        }else{
          alert("No se ha eliminado al alumno");
          console.log("No se ha eliminado al alumno");
        }
      });

    }else{
      alert("No tienes permisos para eliminar este usuario");
      return;
    }
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.obtenerAlumnos();
  }

  onSortChange(sort: Sort) {
    this.sortField = sort.active;
    this.sortDirection = sort.direction;
    this.pageIndex = 0;
    this.obtenerAlumnos();
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
  matricula: number;
  first_name: string;
  last_name: string;
  email: string;
  fecha_nacimiento: string,
  telefono: string,
  rfc: string,
  curp: string,
}



