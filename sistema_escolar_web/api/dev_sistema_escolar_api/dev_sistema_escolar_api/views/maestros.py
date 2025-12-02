from django.db.models import *
from django.db import transaction
from django.shortcuts import get_object_or_404
from dev_sistema_escolar_api.serializers import UserSerializer
from dev_sistema_escolar_api.serializers import *
from dev_sistema_escolar_api.models import *
from rest_framework import permissions
from rest_framework import generics
from rest_framework import status
from rest_framework.response import Response
from django.contrib.auth.models import Group
import json
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination


class MaestroPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


    
class MaestrosAll(generics.CreateAPIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = MaestroSerializer
    pagination_class = MaestroPagination
    
    def get_queryset(self):
        queryset = Maestros.objects.filter(user__is_active=1).select_related('user')
        
        # Búsqueda
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(id__icontains=search) |
                Q(id_trabajador__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__email__icontains=search) |
                Q(rfc__icontains=search) |
                Q(cubiculo__icontains=search) |
                Q(fecha_nacimiento__icontains=search)
            )
        
        # Ordenamiento con mapeo
        ordering = self.request.query_params.get('ordering', 'id_trabajador')
        
        field_mapping = {
            'nombre': 'user__first_name',
            '-nombre': '-user__first_name',
            'email': 'user__email',
            '-email': '-user__email',
            'id': 'id',
            '-id': '-id',
            'id_trabajador': 'id_trabajador',
            '-id_trabajador': '-id_trabajador',
            'rfc': 'rfc',
            '-rfc': '-rfc',
            'cubiculo': 'cubiculo',
            '-cubiculo': '-cubiculo',
            'fecha_nacimiento': 'fecha_nacimiento',
            '-fecha_nacimiento': '-fecha_nacimiento',
        }
        
        ordering_field = field_mapping.get(ordering, 'id_trabajador')
        queryset = queryset.order_by(ordering_field)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            lista = serializer.data
            
            for maestro in lista:
                if isinstance(maestro, dict) and "materias_json" in maestro:
                    try:
                        maestro["materias_json"] = json.loads(maestro["materias_json"])
                    except Exception:
                        maestro["materias_json"] = []
            
            return self.get_paginated_response(lista)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get(self, request, *args, **kwargs):
        return self.list(request, *args, **kwargs)
    
class MaestrosView(generics.CreateAPIView):
    #obtener usuario por id
    permission_classes = (permissions.IsAuthenticated,)
    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def get(self, request, *args, **kwargs):
        maestro = get_object_or_404(Maestros, id = request.GET.get("id"))
        maestro = MaestroSerializer(maestro, many=False).data
        if "materias_json" in maestro:
            try:
                maestro["materias_json"] = json.loads(maestro["materias_json"])
            except Exception:
                maestro["materias_json"] = []
        return Response(maestro, 200)
    
    
    #Registrar nuevo usuario maestro
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = UserSerializer(data=request.data)
        if user.is_valid():
            role = request.data['rol']
            first_name = request.data['first_name']
            last_name = request.data['last_name']
            email = request.data['email']
            password = request.data['password']
            existing_user = User.objects.filter(email=email).first()
            if existing_user:
                return Response({"message":"Username "+email+", is already taken"},400)
            user = User.objects.create( username = email,
                                        email = email,
                                        first_name = first_name,
                                        last_name = last_name,
                                        is_active = 1)
            user.save()
            user.set_password(password)
            user.save()
            
            group, created = Group.objects.get_or_create(name=role)
            group.user_set.add(user)
            user.save()
            #Create a profile for the user
            maestro = Maestros.objects.create(user=user,
                                            id_trabajador= request.data["id_trabajador"],
                                            fecha_nacimiento= request.data["fecha_nacimiento"],
                                            telefono= request.data["telefono"],
                                            rfc= request.data["rfc"].upper(),
                                            cubiculo= request.data["cubiculo"],
                                            area_investigacion= request.data["area_investigacion"],
                                            materias_json = json.dumps(request.data["materias_json"]))
            maestro.save()
            return Response({"maestro_created_id": maestro.id }, 201)
        return Response(user.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @transaction.atomic
    def put(self, request, *args, **kwargs):
        maestro = get_object_or_404(Maestros, id=request.data["id"])
        user = maestro.user
        user.first_name = request.data["first_name"]
        user.last_name = request.data["last_name"]
        
        user.save()
        
        maestro.id_trabajador= request.data["id_trabajador"]
        maestro.fecha_nacimiento= request.data["fecha_nacimiento"]
        maestro.telefono= request.data["telefono"]
        maestro.rfc= request.data["rfc"].upper()
        maestro.cubiculo= request.data["cubiculo"]
        maestro.area_investigacion= request.data["area_investigacion"]
        maestro.materias_json = json.dumps(request.data["materias_json"])
        maestro.save()
        
        return Response({"message": "Maestro actualizado correctamente", "maestro": MaestroSerializer(maestro).data}, 200)
    
    # Eliminar maestro con delete (Borrar realmente)
    @transaction.atomic
    def delete(self, request, *args, **kwargs):
        maestro = get_object_or_404(Maestros, id=request.GET.get("id"))
        try:
            maestro.user.delete()
            return Response({"details":"Maestro eliminado"},200)
        except Exception as e:
            return Response({"details":"Algo pasó al eliminar"},400)
    
    #Eliminar maestro (Desactivar usuario)
    # @transaction.atomic
    # def delete(self, request, *args, **kwargs):
    #     id_maestro = kwargs.get('id_maestro', None)
    #     if id_maestro:
    #         try:
    #             maestro = Maestros.objects.get(id=id_maestro)
    #             user = maestro.user
    #             user.is_active = 0
    #             user.save()
    #             return Response({"message":"Maestro con ID "+str(id_maestro)+" eliminado correctamente."},200)
    #         except Maestros.DoesNotExist:
    #             return Response({"message":"Maestro con ID "+str(id_maestro)+" no encontrado."},404)
    #     return Response({"message":"Se necesita el ID del maestro."},400)
    
   